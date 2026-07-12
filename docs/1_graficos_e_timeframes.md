# Funcionalidade 1: Gráficos de Alta Periodicidade (HTF) e Integração TradingView

Esta funcionalidade é responsável pela renderização dos gráficos de preços interativos para os ativos **BTC/USD, ETH/USD e SOL/USD** nos tempos gráficos de **3 dias (3d), 1 semana (1w), 2 semanas (2w) e mensal (1M)**.

---

## 1. Descrição Detalhada
A maior parte das exchanges de criptoativos (como Binance, Bybit) oferece dados históricos de velas (candlesticks) nativos para 1 dia (1d), 1 semana (1w) e 1 mês (1M). No entanto, tempos gráficos como **3 dias (3d)** e **2 semanas (2w)** não costumam estar disponíveis diretamente em seus endpoints públicos.

Portanto, esta funcionalidade consiste em:
1. **Consumo de Dados de Base (1d)**: Obtenção de dados históricos diários das velas (Open, High, Low, Close, Volume, Timestamp).
2. **Motor de Agregação**: Algoritmo para consolidar velas diárias em blocos maiores para gerar com precisão os timeframes customizados (3d e 2w).
3. **Renderização Interativa**: Integração com a biblioteca `@tradingview/lightweight-charts` no frontend Next.js para renderizar o gráfico com performance nativa e visual premium.

---

## 2. Passo a Passo da Implementação

### Passo 1: Aquisição de Dados de Mercado
No backend ou em um script de sincronização, buscar dados históricos diários (intervalo `1d`) a partir da API da Binance (ou similar).
* **Endpoint Binance**: `GET /api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000`
* **Campos coletados**:
  ```json
  [
    [
      1499040000000,      // Open time
      "0.01634790",       // Open
      "0.80000000",       // High
      "0.01575800",       // Low
      "0.01577100",       // Close
      "148976.11400000",  // Volume
      1499644799999,      // Close time
      ...
    ]
  ]
  ```

### Passo 2: Algoritmo de Agregação de Velas (Timeframe Customizado)
Como calcular os timeframes de 3 dias e 2 semanas:

#### A) Agrupamento de 3 Dias (3d):
Agrupar velas diárias de 3 em 3 a partir de uma data de referência fixa (segunda-feira ou epoch 0).
* **Regra de Consolidação**:
  * **Open (Abertura)**: Valor de abertura da primeira vela do grupo.
  * **High (Máxima)**: Valor máximo entre as 3 velas do grupo.
  * **Low (Mínima)**: Valor mínimo entre as 3 velas do grupo.
  * **Close (Fechamento)**: Valor de fechamento da última vela do grupo.
  * **Volume**: Soma do volume das 3 velas do grupo.
  * **Time**: O timestamp de abertura da primeira vela do grupo.

#### B) Agrupamento de 2 Semanas (2w):
Agrupar velas semanais (1w) de 2 em 2, ou velas diárias de 14 em 14, sempre alinhadas com as segundas-feiras.

*Código de exemplo em TypeScript para agregação de N dias:*
```typescript
interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function aggregateCandles(candles1d: Candle[], days: number): Candle[] {
  const aggregated: Candle[] = [];
  
  for (let i = 0; i < candles1d.length; i += days) {
    const chunk = candles1d.slice(i, i + days);
    if (chunk.length === 0) continue;
    
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    const high = Math.max(...chunk.map(c => c.high));
    const low = Math.min(...chunk.map(c => c.low));
    const volume = chunk.reduce((sum, c) => sum + c.volume, 0);
    const time = chunk[0].time;
    
    aggregated.push({ time, open, high, low, close, volume });
  }
  
  return aggregated;
}
```

### Passo 3: Configuração do TradingView Lightweight Charts
No React/Next.js, criar um componente wrapper para renderizar o gráfico:

1. Instalar a biblioteca:
   ```bash
   npm install lightweight-charts
   ```
2. Inicializar o gráfico com configurações visuais premium (estilo darkmode):
   ```typescript
   import { createChart, ColorType } from 'lightweight-charts';
   
   const chart = createChart(chartContainerRef.current, {
     layout: {
       background: { type: ColorType.Solid, color: '#09090b' }, // Zinc 950
       textColor: '#a1a1aa', // Zinc 400
     },
     grid: {
       vertLines: { color: 'rgba(39, 39, 42, 0.3)' },
       horzLines: { color: 'rgba(39, 39, 42, 0.3)' },
     },
     crosshair: {
       mode: 0,
       vertLine: { color: '#8b5cf6', labelBackgroundColor: '#8b5cf6' }, // Violet 500
       horzLine: { color: '#8b5cf6', labelBackgroundColor: '#8b5cf6' },
     },
     width: chartContainerRef.current.clientWidth,
     height: 500,
   });
   
   const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
     upColor: '#10b981', // Emerald 500
     downColor: '#ef4444', // Red 500
     borderVisible: false,
     wickUpColor: '#10b981',
     wickDownColor: '#ef4444',
   });
   ```

### Passo 4: Sincronização e Responsividade
* Garantir que o gráfico seja redimensionado automaticamente usando o `ResizeObserver` no container HTML.
* Implementar a alternância dinâmica de ativos (BTC, ETH, SOL) limpando os dados da série anterior e definindo os novos dados agregados.
