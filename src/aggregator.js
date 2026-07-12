/**
 * Módulo de agregação de velas e consumo de dados de mercado (Binance API).
 */

// Mapeamento de símbolos para Binance
const SYMBOL_MAP = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT'
};

/**
 * Busca dados históricos da Binance para um ativo.
 * @param {string} symbol - BTC, ETH ou SOL
 * @param {string} interval - Intervalo nativo (1d, 1w, 1M)
 * @param {number} limit - Número máximo de velas (default: 500)
 * @returns {Promise<Array>} Velas no formato { time, open, high, low, close, volume }
 */
export async function fetchBinanceKlines(symbol, interval, limit = 500) {
  const binanceSymbol = SYMBOL_MAP[symbol] || 'BTCUSDT';
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro na API da Binance: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(d => ({
      time: Math.floor(d[0] / 1000), // Converte ms para segundos (TradingView usa segundos)
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    }));
  } catch (error) {
    console.error(`Erro ao buscar dados para ${symbol} (${interval}):`, error);
    throw error;
  }
}

/**
 * Agrega velas diárias (1d) em períodos customizados de N dias.
 * @param {Array} candles1d - Array de velas diárias
 * @param {number} days - Quantidade de dias (ex: 3 para 3d, 14 para 2w)
 * @returns {Array} Velas agrupadas
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
    const time = chunk[0].time; // Timestamp inicial do grupo
    
    aggregated.push({ time, open, high, low, close, volume });
  }
  
  return aggregated;
}

/**
 * Obtém os dados de velas para qualquer timeframe (suporta nativos e customizados).
 * @param {string} symbol - BTC, ETH, SOL
 * @param {string} timeframe - 3d, 1w, 2w, 1M
 * @returns {Promise<Array>}
 */
export async function getCandleData(symbol, timeframe) {
  if (timeframe === '3d') {
    // 3d: Busca diário (1d) e agrega de 3 em 3
    const data1d = await fetchBinanceKlines(symbol, '1d', 999);
    return aggregateCandles(data1d, 3);
  } else if (timeframe === '2w') {
    // 2w: Busca diário (1d) e agrega de 14 em 14
    const data1d = await fetchBinanceKlines(symbol, '1d', 999);
    return aggregateCandles(data1d, 14);
  } else if (timeframe === '1w') {
    // 1w: Nativo
    return await fetchBinanceKlines(symbol, '1w', 500);
  } else if (timeframe === '1M') {
    // 1M: Nativo
    return await fetchBinanceKlines(symbol, '1M', 500);
  } else {
    throw new Error(`Timeframe não suportado: ${timeframe}`);
  }
}
