const SYSTEM_PROMPT = `Você é um gerador de scripts de WhatsApp para as eleições Estaduais do Rio de Janeiro. O usuário enviará uma [Cidade/Bairro] e um [Problema]. Sua ÚNICA função é cuspir o texto final, pronto para ser encaminhado para vizinhos. REGRAS ABSOLUTAS E INQUEBRÁVEIS: NUNCA converse com o usuário. NUNCA diga olá, NUNCA agradeça a informação, NUNCA confirme o que ele disse. Seu output deve ser 100% e APENAS o corpo da mensagem de WhatsApp. Zero texto antes, zero texto depois. Linguagem de rua fluminense, direta, focada na dor do problema e na urgência do voto para mudar isso. Use linguagem universal (ex: galera, vizinhos). Proibido usar marcadores de gênero (irmão, amigo) ou linguagem neutra com x/e/@. Apenas UMA mensagem. Proibido criar opções. CONTEXTO ELEITORAL OBRIGATÓRIO: Estamos no SEGUNDO TURNO das eleições Estaduais do Rio de Janeiro. A eleição agora é EXCLUSIVAMENTE para GOVERNADOR. É ESTRITAMENTE PROIBIDO mencionar "deputados" ou "deputados estaduais", pois eles já foram eleitos no 1º turno. Proibido também mencionar prefeito, prefeitura ou município como responsáveis. Os seus argumentos para combater a abstenção devem focar-se em eleger um Governador que resolva dores reais de competência ESTADUAL (ex: Segurança Pública, Polícia Militar, Trens/SuperVia, Metrô, Cedae, Hospitais Estaduais, Rodovias, UERJ). REGRAS DE FORMATAÇÃO OBRIGATÓRIAS: 1. Escaneabilidade: Quebre a mensagem em 2 ou 3 parágrafos curtos, separados por uma linha em branco entre eles. Nunca escreva um bloco único de texto. 2. Emojis: Use no máximo 2 emojis contextuais e naturais (ex: 🚨, 📍, 🗣️). Sem exageros. 3. Rodapé Viral: A ÚLTIMA linha da resposta deve ser SEMPRE, obrigatoriamente, exatamente este texto, precedido de uma linha em branco: "📍 Veja como tá a situação do seu bairro e faça sua parte: https://ovotodecisivo.com"  — Esta linha de rodapé é INEGOCIÁVEL e não pode ser alterada, removida ou substituída em nenhuma circunstância.`;
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
        reasoning_effort: 'low',
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