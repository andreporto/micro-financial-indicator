# 📊 SaaS Financial Indicator - Dashboard & Documentação Interativa

Este repositório contém a implementação completa de uma plataforma SaaS financeira moderna e contemporânea voltada para a análise técnica e fundamental macro de criptoativos (**BTC, ETH, SOL**) em tempos gráficos elevados (HTF) integrada a dados on-chain de alta fidelidade.

A aplicação utiliza um design de informações limpo e profissional, estruturado em **Abas Modulares** com navegação fluida, utilizando uma paleta de cores harmoniosa em azul escuro, branco, cinza e tons funcionais de sinalização (verde bullish, vermelho bearish, laranja de aviso).

---

## 🚀 Funcionalidades Principais

*   **Dashboard Técnico com 3 Gráficos Sincronizados**: 
    *   Gráfico de Preço (Velas, EMA 9/21/52, SMA 100/200, FVG e Suporte/Resistência).
    *   Gráfico de RSI Clássico com limites em 30 e 70.
    *   Gráfico de Stochastic RSI (%K e %D) com limites em 20 e 80.
    *   *Sincronização Bidirecional*: O zoom e scroll manual em qualquer um dos três gráficos replica-se instantaneamente nos demais (escala de barras lógica alinhada via Whitespace).
*   **Algoritmo de Suporte & Resistência Inteligente**: Pivôs consolidados por volume de toques históricos e reclassificados dinamicamente via regra de **Inversão de Papel (Role Reversal)** em relação ao preço spot.
*   **Motor de Predição (SCM)**: O *Score de Confluência Multidimensional* pondera indicadores de tendência, momento, price action e on-chain para calcular o viés e zonas táticas para os próximos 60 dias.
*   **Dados On-Chain Consolidados**: Seção visual expandida exibindo a faixa atual do **Rainbow Chart**, progresso do **MVRV Z-Score** e margem em relação ao custo médio de curto (**STH-RP**) e longo prazo (**LTH-RP**).
*   **Aviso de Isenção de Responsabilidade (Disclaimer)**: Informações claras e visíveis no Hero, aba de predição e rodapé, detalhando a natureza probabilística e puramente educacional das simulações da IA.

---

## 📁 Estrutura de Arquivos

```
saas-financial-indicator/
├── docs/                        # Detalhamento teórico e passo a passo de cada módulo
│   ├── 1_graficos_e_timeframes.md
│   ├── 2_medias_moveis_e_indicadores.md
│   ├── 3_deteccao_divergencias.md
│   ├── 4_fvg_suporte_resistencia.md
│   ├── 5_confluencia_onchain.md
│   └── 6_estrategia_predicao.md
├── src/                         # Módulos de lógica puras (ESM)
│   ├── aggregator.js            # Consumo da API da Binance e agregação de velas (3d, 2w)
│   └── indicators.js            # Cálculos de SMA, EMA, RSI, StochRSI, Divergências, FVGs e S/R
├── tests/                       # Scripts de teste automatizados em Node.js
│   ├── test_aggregator.js       # Teste da busca e agrupamento de velas
│   └── test_indicators.js       # Teste dos indicadores e motor preditivo
├── index.html                   # Landing Page de Documentação e Dashboard Interativo
├── style.css                    # Estilização moderna e contemporânea (Dark Theme Blue/Gray)
├── app.js                       # Controlador frontend que gerencia a UI e os gráficos TradingView
├── Dockerfile                   # Dockerfile contendo a imagem do Nginx
├── docker-compose.yml           # Arquivo do Docker Compose para orquestração local rápida
├── plano_projeto.md             # Plano de arquitetura original
└── README.md                    # Este arquivo de orientações
```

---

## 🛠️ Instalação e Configuração Local

Como a aplicação é estruturada usando módulos ES6 nativos no navegador (`import`/`export`), abrir o `index.html` diretamente por clique duplo (`file://`) causará erro de CORS. É necessário rodar o projeto sob um servidor HTTP.

### Pré-requisitos
*   **Node.js** instalado (Recomendado) ou **Python**.

### Passo a Passo
1.  Clone este repositório para a sua máquina local:
    ```bash
    git clone <url-do-repositorio>
    cd saas-financial-indicator
    ```
2.  Inicie o servidor local:
    *   **Usando Node.js (via npx)**:
        ```bash
        npx http-server -p 9080
        ```
    *   **Usando Python**:
        ```bash
        python -m http.server 9080
        ```
3.  Acesse no seu navegador: **`http://localhost:9080`**

### Executando Testes Unitários
Para validar a precisão dos cálculos matemáticos de indicadores e o motor de agregação da API da Binance, execute os scripts de teste via terminal:
```bash
# Testar a integração e agregação de velas da Binance
node tests/test_aggregator.js

# Testar o motor de cálculo dos indicadores técnicos e previsões SCM
node tests/test_indicators.js
```

---

## 🐳 Dockerização no Servidor Local

Dockerizar o projeto permite que você execute a aplicação de forma isolada, leve e sem necessidade de ter Node.js ou Python instalados diretamente na máquina servidora.

### Método 1: Usando o Docker Compose (Recomendado)
Para rodar de forma simples e rápida com uma única instrução:
```bash
# Sobe o container em segundo plano (background) na porta 9080
docker compose up -d
```
Para parar o container:
```bash
docker compose down
```

### Método 2: Docker CLI Manual
Se preferir compilar e rodar a imagem manualmente:
1.  **Construir a imagem Docker**:
    ```bash
    docker build -t saas-financial-indicator .
    ```
2.  **Executar o container**:
    ```bash
    docker run -d -p 9080:80 --name saas-financial-indicator saas-financial-indicator
    ```
3.  **Verificar logs**:
    ```bash
    docker logs saas-financial-indicator
    ```

A aplicação estará disponível em `http://localhost:9080` rodando sob o servidor Nginx embarcado no container.

---

## 🌐 Disponibilização para a Internet (Deploy)

Como o projeto é **100% estático (Frontend Pure HTML/CSS/JS)**, existem diversas maneiras eficientes de disponibilizá-lo para o mundo:

### Opção A: Exposição Segura de Servidor Local (Túneis)
Se você está rodando o servidor em uma máquina física local (ou Raspberry Pi) e deseja acessá-lo externamente sem expor portas no seu roteador (sem Port Forwarding):

1.  **Cloudflare Tunnels (Recomendado & Gratuito)**:
    *   Instale o `cloudflared` em sua máquina.
    *   Autentique e crie o túnel:
        ```bash
        cloudflared tunnel login
        cloudflared tunnel create meu-saas-tunnel
        ```
    *   Associe a um subdomínio de sua propriedade:
        ```bash
        cloudflared tunnel route dns meu-saas-tunnel saas.meudominio.com
        ```
    *   Inicie o túnel apontando para a porta local do projeto (seja via Docker ou Local Host):
        ```bash
        cloudflared tunnel run --url http://localhost:9080 meu-saas-tunnel
        ```
        *A Cloudflare fornecerá HTTPS/SSL automático gratuitamente.*

2.  **Ngrok (Rápido para Testes)**:
    *   Instale o ngrok e execute:
        ```bash
        ngrok http 9080
        ```
    *   O terminal fornecerá uma URL pública temporária (ex: `https://abcd-123.ngrok-free.app`).

---

### Opção B: Hospedagem Estática em Nuvem (Altamente Recomendado)
Por não possuir banco de dados ou backend dedicado (consome APIs públicas diretamente do navegador), o projeto é um candidato perfeito para plataformas de hospedagem estática global (CDNs). É a opção mais rápida e barata (geralmente grátis).

1.  **Vercel / Netlify**:
    *   Crie uma conta gratuita nas plataformas.
    *   Conecte o seu repositório Git (GitHub, GitLab).
    *   Selecione o diretório do projeto.
    *   Configure as opções de build como vazias (pois o projeto usa HTML puro).
    *   Clique em **Deploy**. A plataforma fornecerá um domínio gratuito com SSL automático.

2.  **GitHub Pages**:
    *   No repositório do seu projeto no GitHub, acesse **Settings** > **Pages**.
    *   Selecione a branch `main` e a pasta raiz (`/`) como fonte.
    *   Salve. Seu site estará disponível em `https://seu-usuario.github.io/nome-do-repositorio/`.
