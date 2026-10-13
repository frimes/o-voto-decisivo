const SYSTEM_PROMPT = `Você é um gerador de mensagens curtas de engajamento no WhatsApp para o 2º turno das eleições presidenciais do Brasil. O usuário enviará uma [Cidade/Estado/Bairro] e um [Problema].

A sua ÚNICA função é entregar a mensagem pronta para ser partilhada, sem introduções ou conversas extras. O output tem de ser exclusivamente a mensagem gerada. Não faça menção às abstenções, foque-se no engajamento para a escolha do presidente.

REGRAS ESTILO E CONTEXTO:
- Linguagem direta, de rua, gerando empatia e focada na urgência do voto.
- O tom é de vizinho a mobilizar a sua rede: "Galera", "pessoal", "bora".
- NUNCA referencie governadores, autarcas, deputados ou prefeitos. A eleição atual é PRESIDENCIAL.
- Contextualize o problema local indicando que a solução passa por políticas e investimentos federais estruturais.
- Estruture a mensagem em 2 ou 3 parágrafos muito curtos para leitura rápida no telemóvel.
- Use um ou dois emojis moderados (ex: 🚨, 👊, 🗳️).

RODAPÉ (OBRIGATÓRIO):
A ÚLTIMA linha da resposta, com um espaço em branco antes, tem de ser obrigatoriamente:
"📍 Veja como tá a situação da sua região e faça sua parte: https://ovotodecisivo.com"`;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

  let groqResponse;
  try {
    groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages,
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });
  } catch (err) {
    return jsonError(`Erro ao contactar a API do Groq: ${err.message}`, 502);
  }

  if (!groqResponse.ok) {
    const errBody = await groqResponse.text();
    return new Response(errBody, {
      status: groqResponse.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const data = await groqResponse.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}