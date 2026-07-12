# Feature 1: High Time Frame (HTF) Charts and TradingView Integration

This feature is responsible for rendering interactive price charts for the assets **BTC/USD, ETH/USD, and SOL/USD** on the timeframes of **3 days (3d), 1 week (1w), 2 weeks (2w), and monthly (1M)**.

---

## 1. Detailed Description
Most crypto exchanges (like Binance, Bybit) offer native historical candle data for 1 day (1d), 1 week (1w), and 1 month (1M). However, timeframes like **3 days (3d)** and **2 weeks (2w)** are not usually directly available in their public endpoints.

Therefore, this feature consists of:
1. **Base Data Consumption (1d)**: Fetching daily historical candle data (Open, High, Low, Close, Volume, Timestamp).
2. **Aggregation Engine**: Algorithm to consolidate daily candles into larger blocks to precisely generate custom timeframes (3d and 2w).
3. **Interactive Rendering**: Integration with the `@tradingview/lightweight-charts` library on the Next.js frontend to render charts with native performance and premium visuals.

---

## 2. Step-by-Step Implementation

### Step 1: Market Data Acquisition
On the backend or in a synchronization script, fetch daily historical data (interval `1d`) from the Binance API (or similar).
* **Binance Endpoint**: `GET /api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000`
* **Collected fields**:
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

### Step 2: Candle Aggregation Algorithm (Custom Timeframe)
How to calculate 3-day and 2-week timeframes:

#### A) 3-Day Grouping (3d):
Group daily candles every 3 days from a fixed reference date (Monday or epoch 0).
* **Consolidation Rule**:
  * **Open**: Opening price of the first candle in the group.
  * **High**: Maximum value among the 3 candles in the group.
  * **Low**: Minimum value among the 3 candles in the group.
  * **Close**: Closing price of the last candle in the group.
  * **Volume**: Sum of the volume of the 3 candles in the group.
  * **Time**: Opening timestamp of the first candle in the group.

#### B) 2-Week Grouping (2w):
Group weekly candles (1w) in pairs, or daily candles in groups of 14, always aligned with Mondays.

**Example TypeScript code for N-day aggregation:**
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

### Step 3: TradingView Lightweight Charts Configuration
In React/Next.js, create a wrapper component to render the chart:

1. Install the library:
   ```bash
   npm install lightweight-charts
   ```
2. Initialize the chart with premium visual settings (dark mode style):
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

### Step 4: Synchronization and Responsiveness
* Ensure the chart is automatically resized using `ResizeObserver` on the HTML container.
* Implement dynamic asset switching (BTC, ETH, SOL) by clearing the previous series' data and setting the new aggregated data.
