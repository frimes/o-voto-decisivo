const SYSTEM_PROMPT = `Você é um gerador de mensagens curtas de engajamento no WhatsApp para o 2º turno da eleição presidencial do Brasil. O usuário enviará uma [Cidade/Estado/Bairro] e um [Problema].

A sua ÚNICA função é entregar a mensagem pronta para ser partilhada, sem introduções ou conversas extras. O output tem de ser exclusivamente a mensagem gerada. Não faça menção às abstenções; foque-se no engajamento para a escolha do presidente.

REGRAS DE ESTILO E CONTEXTO:
- Linguagem direta e acessível, gerando empatia e focada na urgência do voto.
- O tom é de vizinho a mobilizar a sua rede: "Galera", "pessoal", "vamos juntos".
- A eleição atual é EXCLUSIVAMENTE PRESIDENCIAL. NUNCA referencie governadores, deputados, prefeitos ou vereadores.
- Adapte dinamicamente o tom e cite o problema local de forma concreta e natural, sempre com base no bairro/cidade/estado informado pelo usuário.
- Aborde temas pragmáticos e universais do cenário nacional (ex: saúde, educação, emprego, segurança, custo de vida), mostrando que a solução passa por políticas e investimentos federais estruturais.
- Estruture a mensagem em 2 ou 3 parágrafos muito curtos para leitura rápida no celular.
- Use um ou dois emojis moderados (ex: 🚨, 👊, 🗳️).
- Escreva em português do Brasil. Diga "segundo turno", nunca "segunda volta". Interprete gírias no sentido usado no Brasil (ex.: "trombadinha" = batedor de carteira, "cracudo" = usuário de crack).
- Não invente números, dados ou promessas específicas. Não atribua ao presidente responsabilidade direta por serviços municipais ou estaduais; fale de políticas federais de forma geral.

RODAPÉ (OBRIGATÓRIO):
A resposta termina obrigatoriamente com estas duas linhas, nesta ordem, com um espaço em branco antes:
"📍 Veja como tá a situação da sua região e faça sua parte: https://ovotodecisivo.com"
"🤖 Mensagem criada com ajuda de IA"`;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const CLOUDFLARE_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const DEEPSEEK_TIMEOUT_MS = 15000;
const GROQ_TIMEOUT_MS = 10000;
const MAX_TOKENS = 400;
const TEMPERATURE = 0.8;

const SERVER_BUSY_MESSAGE = 'Opa! Nosso servidor está sobrecarregado no momento. 😅 A disputa está acirrada, aguarde 1 minuto e tente novamente.';

const ALLOWED_ORIGINS = ['https://ovotodecisivo.com', 'http://localhost:8000'];

// Reflete a origem autorizada em Access-Control-Allow-Origin. Se a origem não
// constar na whitelist, devolve a origem principal (o browser irá bloquear).
function corsHeadersFor(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeadersFor(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === 'POST' && url.pathname.endsWith('/api/chat')) {
      const origin = request.headers.get('Origin');
      if (!ALLOWED_ORIGINS.includes(origin)) {
        return jsonError('Origem não autorizada.', 403, cors);
      }
      return handleChat(request, env, cors);
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
};

async function handleChat(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Body inválido. Envie JSON com { messages: [...] }', 400, cors);
  }

  const userMessages = body.messages;
  if (!Array.isArray(userMessages) || userMessages.length === 0) {
    return jsonError('Campo "messages" ausente ou vazio.', 400, cors);
  }

  // Descarta qualquer mensagem com role 'system' injetada pelo cliente.
  const sanitized = userMessages.filter((m) => m && m.role !== 'system');

  if (sanitized.length === 0) {
    return jsonError('Nenhuma mensagem de utilizador válida.', 400, cors);
  }

  if (sanitized.length > 6) {
    return jsonError('Máximo de 6 mensagens por pedido.', 400, cors);
  }

  const invalidContent = sanitized.some(
    (m) => typeof m.content !== 'string' || m.content.length > 600
  );
  if (invalidContent) {
    return jsonError('Cada mensagem deve ter no máximo 600 caracteres.', 400, cors);
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...sanitized,
  ];

  // Cadeia de fallback: DeepSeek -> Cloudflare Workers AI -> Groq -> busy.
  // 1. DeepSeek
  const deepseek = await callChatProvider({
    name: 'deepseek',
    url: DEEPSEEK_API_URL,
    apiKey: env.DEEPSEEK_API_KEY,
    model: 'deepseek-chat',
    messages,
    timeoutMs: DEEPSEEK_TIMEOUT_MS,
  });
  if (deepseek.ok) {
    return jsonOk(deepseek.data, cors);
  }

  // 2. Cloudflare Workers AI
  try {
    const aiResult = await env.AI.run(CLOUDFLARE_AI_MODEL, {
      messages,
      max_tokens: MAX_TOKENS,
    });
    console.log('PROVIDER', 'cloudflare-ai');
    const content = aiResult && aiResult.response;
    return jsonOk({ choices: [{ message: { content } }] }, cors);
  } catch (err) {
    console.log('FAIL', 'cloudflare-ai', (err && err.name) || 'network_error');
  }

  // 3. Groq
  const groq = await callChatProvider({
    name: 'groq',
    url: GROQ_API_URL,
    apiKey: env.GROQ_API_KEY,
    model: GROQ_MODEL,
    messages,
    timeoutMs: GROQ_TIMEOUT_MS,
  });
  if (groq.ok) {
    return jsonOk(groq.data, cors);
  }

  // 4. Todos os provedores falharam.
  return chatResponse(SERVER_BUSY_MESSAGE, true, cors, 'all_providers_failed');
}

// Chama um provedor compatível com a API OpenAI. Registra 'PROVIDER' quando
// responde com sucesso e 'FAIL' (com o status ou nome do erro) em qualquer
// falha de rede, timeout ou status não-ok. Devolve { ok, data }.
async function callChatProvider({ name, url, apiKey, model, messages, timeoutMs }) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.log('FAIL', name, (err && err.name) || 'network_error');
    return { ok: false };
  }

  if (!response.ok) {
    console.log('FAIL', name, response.status);
    return { ok: false };
  }

  console.log('PROVIDER', name);
  return { ok: true, data: await response.json() };
}

function jsonOk(data, cors) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

// Devolve uma resposta no formato de sucesso do modelo (status 200) para que o
// front-end exiba a mensagem amigável normalmente, sem precisar ser alterado.
// Quando `busy` é true, marca o payload com "busy": true e registra o status
// nos logs do Worker (console.log('BUSY', status)).
function chatResponse(content, busy, cors, status) {
  if (busy) {
    console.log('BUSY', status);
  }
  const payload = {
    choices: [{ message: { role: 'assistant', content } }],
  };
  if (busy) {
    payload.busy = true;
  }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function jsonError(message, status, cors) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}