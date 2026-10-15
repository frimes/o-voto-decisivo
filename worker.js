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
- Não invente números, dados ou promessas específicas. Não atribua ao presidente responsabilidade direta por serviços municipais ou estaduais; fale de políticas federais de forma geral.

RODAPÉ (OBRIGATÓRIO):
A resposta termina obrigatoriamente com estas duas linhas, nesta ordem, com um espaço em branco antes:
"📍 Veja como tá a situação da sua região e faça sua parte: https://ovotodecisivo.com"
"🤖 Mensagem criada com ajuda de IA"`;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

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

  let deepseekResponse;
  try {
    deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 400,
      }),
    });
  } catch (err) {
    return chatResponse(SERVER_BUSY_MESSAGE, true, cors, 'network_error');
  }

  if (!deepseekResponse.ok) {
    return chatResponse(SERVER_BUSY_MESSAGE, true, cors, deepseekResponse.status);
  }

  const data = await deepseekResponse.json();

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