# 🎯 O Voto Decisivo

> **O voto que decide a eleição está escondido nas manchas vermelhas de abstenção. Nós criamos a bússola para encontrá-lo.**

**O Voto Decisivo** é uma ferramenta de tecnologia cívica *open-source* focada em mobilização orgânica. Cruzamos mapas de calor de abstenção eleitoral do TSE com Inteligência Artificial (gpt-oss-20b) para gerar argumentos hiperlocais de WhatsApp, permitindo que qualquer eleitor mobilize sua própria vizinhança com base em problemas reais, fugindo da polarização vazia.

🌍 **Experimente o Piloto em Produção:** [ovotodecisivo.com](https://ovotodecisivo.com)

---

## 🚀 Como Funciona o "Aha Moment"
1. **Mapeamento:** O eleitor abre a ferramenta e a geolocalização o leva ao seu bairro no mapa de calor da abstenção.
2. **A Bússola (IA):** O usuário informa seu bairro e o maior problema local (ex: "Tijuca, falta de segurança").
3. **A Mobilização:** A IA formula um argumento persuasivo, não-panfletário, focando na dor local e na importância do voto, entregando um texto pronto com link direto para o WhatsApp.


<img width="1080" height="1080" alt="GIF_O Voto Decisivo_FUNDO TRANSPARENTE-COMPACT_131026" src="https://github.com/user-attachments/assets/3b9d8359-2ca4-4b81-bf24-53f75a3b672b" />


---

## 🛠️ Stack Tecnológico
Nossa arquitetura foi desenhada para ser ultraleve, gratuita (ou de baixíssimo custo) e altamente escalável para suportar picos de tráfego em época de eleição.

- **Frontend:** HTML/JS Vanilla, Leaflet.js (Mapas), Bootstrap, hospedado no Cloudflare Pages.
- **Backend / IA:** Cloudflare Workers, servindo como proxy seguro para a API do Groq (Modelo: `gpt-oss-20b`).
- **Engenharia de Dados (ETL):** Scripts em Python (Google Colab / Pandas e Folium) para tratamento da base do TSE e exportação do `dados_mapa.json`.

---

## 🗺️ Roadmap Ágil (Onde precisamos de ajuda!)
Estamos escalando a ferramenta de um MVP estadual (RJ) para o **cenário Nacional (Presidencial)**. Nossas *Issues* estão mapeadas nas seguintes Sprints:

- [ ] **Sprint 1 (Dados & Infra):** Refatorar a renderização do mapa de um arquivo JSON gigante para *Vector Tiles* (MVT) ou *Clusters* via Cloudflare R2, suportando o país todo sem travar o navegador.
- [ ] **Sprint 2 (IA & Prompt):** Refinar o *System Prompt* no Worker para a eleição presidencial, garantindo tom de voz adaptável e sem regionalismos engessados.
- [ ] **Sprint 3 (Frontend & UX):** Adaptar a interface inicial, o comportamento da câmera no Leaflet e a acessibilidade para acolher eleitores de qualquer estado.
- [ ] **Sprint 4 (Growth & Cache):** Implementar sistema de cache inteligente no Cloudflare Workers para proteger as cotas da API do Groq.

---

## 🤝 Quer contribuir?
Nós valorizamos muito o seu tempo. Nosso processo de contribuição é assíncrono, direto ao código e sem burocracias. 

Para rodar o projeto localmente em menos de 5 minutos e enviar seu primeiro *Pull Request*, leia nosso [Guia de Contribuição (CONTRIBUTING.md)](CONTRIBUTING.md).
