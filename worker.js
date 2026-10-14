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

RODAPÉ (OBRIGATÓRIO):
A ÚLTIMA linha da resposta, com um espaço em branco antes, tem de ser obrigatoriamente:
"📍 Veja como tá a situação da sua região e faça sua parte: https://ovotodecisivo.com"`;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const SERVER_BUSY_MESSAGE = 'Opa! Nosso servidor está sobrecarregado no momento. 😅 A disputa está acirrada, aguarde 1 minuto e tente novamente.';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === 'POST' && url.pathname.endsWith('/api/chat')) {
      return handleChat(request, env);
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};

async function handleChat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Body inválido. Envie JSON com { messages: [...] }', 400);
  }

  const userMessages = body.messages;
  if (!Array.isArray(userMessages) || userMessages.length === 0) {
    return jsonError('Campo "messages" ausente ou vazio.', 400);
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages,
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
        max_tokens: 2000,
      }),
    });
  } catch (err) {
    return chatResponse(SERVER_BUSY_MESSAGE);
  }

  if (!deepseekResponse.ok) {
    return chatResponse(SERVER_BUSY_MESSAGE);
  }

  const data = await deepseekResponse.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Devolve uma resposta no formato de sucesso do modelo (status 200) para que o
// front-end exiba a mensagem amigável normalmente, sem precisar ser alterado.
function chatResponse(content) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { role: 'assistant', content } }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  );
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}