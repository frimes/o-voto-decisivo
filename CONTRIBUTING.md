# 🤝 Como Contribuir

Obrigado pelo interesse em contribuir com **O Voto Decisivo**! Nossa cultura de desenvolvimento é baseada em **comunicação assíncrona e código**. Sabemos que seu tempo como voluntário é valioso, então estruturamos este repositório para que você faça o setup em 5 minutos e comece a "codar" sem precisar de reuniões de alinhamento.

## 📚 Leitura Recomendada
Antes de começar, entenda a lógica por trás da ferramenta lendo a nossa documentação base de arquitetura:
🔗 **[O Voto Decisivo: Arquitetura e IA do Campanhista](https://docs.google.com/document/d/1utTNnQZ7DwUfkWOknB_sYHKCEOwRUR6GhbqHIsW2gMA/edit?usp=sharing)**

---

## 💻 Setup Local Expresso (Em 5 minutos)

O repositório é incrivelmente simples. Não usamos *bundlers* pesados no frontend para garantir performance e facilidade de manutenção.

### 1. Frontend (Mapa e Interface)
1. Faça um `Fork` deste repositório e clone para sua máquina:
   ```bash
   git clone https://github.com/SEU_USUARIO/o-voto-decisivo.git
   cd o-voto-decisivo
   ```
2. Para o Frontend, basta subir um servidor HTTP simples na raiz do projeto. Exemplo com Python:
   ```bash
   python3 -m http.server 8000
   ```
3. Acesse `http://localhost:8000` no navegador.

### 2. Backend (Cloudflare Worker & Groq API)
O backend (`worker.js`) é um Cloudflare Worker que faz a ponte com a API do Groq.
1. Instale o Wrangler (CLI da Cloudflare):
   ```bash
   npm install -g wrangler
   ```
2. O mantenedor irá te passar a chave da API do Groq (`GROQ_API_KEY`) para rodar os testes localmente.
3. Crie um arquivo `.dev.vars` na raiz do projeto e adicione a chave:
   ```text
   GROQ_API_KEY=gsk_sua_chave_aqui_...
   ```
4. Rode o worker localmente:
   ```bash
   wrangler dev worker.js
   ```

*(Nota: Para testar o Frontend apontando para o seu Worker local, altere temporariamente a URL de `fetch('/api/chat')` no `index.html` para a porta local do wrangler, como `http://localhost:8787/api/chat`).*

---

## 🔄 Fluxo de Trabalho (Pull Requests)

1. Olhe a aba de **Issues** e escolha uma tarefa (sugerimos começar pelas com a tag `good first issue` ou `urgente`).
2. Comente na Issue que você está assumindo a tarefa (para evitarmos trabalho duplicado).
3. Crie uma branch para a sua *feature* ou *fix*:
   ```bash
   git checkout -b feature/sua-feature
   ```
4. Faça seus *commits* com mensagens claras e objetivas.
5. Abra um **Pull Request (PR)** para a branch `main`.
6. Na descrição do seu PR, explique brevemente o que foi feito e referencie a Issue correspondente (ex: `Resolves #3`).

## ⚠️ Regras de Ouro
- **Performance:** Nenhuma alteração visual ou de mapa deve quebrar o tempo de carregamento assíncrono. O público-alvo acessa via conexões móveis (3G/4G).
- **Sem complicações:** Mantenha as dependências externas ao mínimo.
- **Dúvidas?** Abra uma Issue com a tag `question` ou comente diretamente na Issue em que está trabalhando. Responderemos por lá o mais rápido possível!

Bora virar essa eleição com inteligência de dados! 🚀
