# SaaS Financial Indicator - Dashboard & Documentação Interativa

Este repositório contém a implementação completa de um SaaS financeiro contemporâneo voltado para a análise macro de criptoativos (BTC, ETH, SOL) em tempos gráficos elevados (HTF) integrado a dados on-chain de alta fidelidade.

A documentação geral do sistema está embutida diretamente na **Landing Page interativa** (`index.html`), onde é possível testar e visualizar o comportamento dos algoritmos em tempo real com dados históricos de mercado.

---

## 🚀 Como Executar o Projeto

Como o projeto utiliza **ES Modules (ESM)** nativos no navegador para importar a lógica de agregação e indicadores de forma modular, o arquivo `index.html` **deve ser aberto através de um servidor local** (para evitar o bloqueio de CORS do protocolo `file://`).

Você pode rodar um servidor local instantaneamente usando qualquer um dos métodos abaixo no diretório do projeto:

### Método 1: Node.js (Recomendado)
```bash
# Executa um servidor local na porta 9080
npx http-server -p 9080
# Ou usando serve:
npx serve -l 9080
```

### Método 2: Python
Se você possui Python instalado:
```bash
python -m http.server 9080
```

Após iniciar o servidor, abra o navegador em `http://localhost:9080` para acessar a Landing Page e o Dashboard.

---

## 📁 Estrutura de Arquivos

```
saas-financial-indicator/
├── docs/                        # Detalhamento teórico e passo a passo de cada funcionalidade
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
├── plano_projeto.md             # Plano de arquitetura original
└── README.md                    # Este arquivo de orientações
```

---

## 🛠️ Validação e Testes Automatizados

Os algoritmos de cálculo matemático e de agregação foram testados e validados usando Node.js. Para reexecutar os testes de validação:

```bash
# Testar a integração e agregação de velas da Binance
node tests/test_aggregator.js

# Testar o motor de cálculo dos indicadores técnicos e previsões
node tests/test_indicators.js
```

Ambos os scripts buscam dados reais do mercado spot para validar os resultados com exatidão matemática.
