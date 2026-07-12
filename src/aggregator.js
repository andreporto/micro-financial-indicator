/**
 * Candle aggregation and market data consumer module (Binance API).
 */

// Symbol mapping to Binance
const SYMBOL_MAP = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT'
};

/**
 * Fetches historical Binance data for an asset.
 * @param {string} symbol - BTC, ETH or SOL
 * @param {string} interval - Native interval (1d, 1w, 1M)
 * @param {number} limit - Maximum number of candles (default: 500)
 * @returns {Promise<Array>} Candles in the format { time, open, high, low, close, volume }
 */
export async function fetchBinanceKlines(symbol, interval, limit = 500) {
  const binanceSymbol = SYMBOL_MAP[symbol] || 'BTCUSDT';
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(d => ({
      time: Math.floor(d[0] / 1000), // Convert ms to seconds (TradingView uses seconds)
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    }));
  } catch (error) {
    console.error(`Error fetching data for ${symbol} (${interval}):`, error);
    throw error;
  }
}

/**
 * Aggregates daily candles (1d) into custom periods of N days.
 * @param {Array} candles1d - Array of daily candles
 * @param {number} days - Number of days (e.g., 3 for 3d, 14 for 2w)
 * @returns {Array} Aggregated candles
 */
export function aggregateCandles(candles1d, days) {
  if (!candles1d || candles1d.length === 0) return [];
  
  const aggregated = [];
  
  for (let i = 0; i < candles1d.length; i += days) {
    const chunk = candles1d.slice(i, i + days);
    if (chunk.length === 0) continue;
    
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    const high = Math.max(...chunk.map(c => c.high));
    const low = Math.min(...chunk.map(c => c.low));
    const volume = chunk.reduce((sum, c) => sum + c.volume, 0);
    const time = chunk[0].time; // Start timestamp of the group
    
    aggregated.push({ time, open, high, low, close, volume });
  }
  
  return aggregated;
}

/**
 * Gets candle data for any timeframe (supports native and custom ones).
 * @param {string} symbol - BTC, ETH, SOL
 * @param {string} timeframe - 3d, 1w, 2w, 1M
 * @returns {Promise<Array>}
 */
export async function getCandleData(symbol, timeframe) {
  if (timeframe === '3d') {
    // 3d: Fetch daily (1d) and aggregate every 3 days
    const data1d = await fetchBinanceKlines(symbol, '1d', 999);
    return aggregateCandles(data1d, 3);
  } else if (timeframe === '2w') {
    // 2w: Fetch daily (1d) and aggregate every 14 days
    const data1d = await fetchBinanceKlines(symbol, '1d', 999);
    return aggregateCandles(data1d, 14);
  } else if (timeframe === '1w') {
    // 1w: Native
    return await fetchBinanceKlines(symbol, '1w', 500);
  } else if (timeframe === '1M') {
    // 1M: Native
    return await fetchBinanceKlines(symbol, '1M', 500);
  } else {
    throw new Error(`Timeframe not supported: ${timeframe}`);
  }
}
