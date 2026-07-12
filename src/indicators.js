/**
 * Technical indicators, pattern detection and prediction engine module.
 */

/**
 * Calculates the Simple Moving Average (SMA).
 * @param {Array<number>} data - Numeric data (usually closes)
 * @param {number} period - Average period
 * @returns {Array<number>} Array of the same size as input, containing values or NaN
 */
export function calculateSMA(data, period) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * Calculates the Exponential Moving Average (EMA).
 * @param {Array<number>} data - Numeric data
 * @param {number} period - Average period
 * @returns {Array<number>} Array containing calculated values or NaN
 */
export function calculateEMA(data, period) {
  const ema = [];
  const k = 2 / (period + 1);
  let prevEma = NaN;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      // The initial value is the corresponding SMA
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      prevEma = sum / period;
      ema.push(prevEma);
    } else {
      const currentEma = (data[i] - prevEma) * k + prevEma;
      ema.push(currentEma);
      prevEma = currentEma;
    }
  }
  return ema;
}

/**
 * Calculates the Relative Strength Index (RSI) with Wilder's smoothing.
 * @param {Array<number>} closes - Closing prices
 * @param {number} period - Period (default: 14)
 * @returns {Array<number>}
 */
export function calculateRSI(closes, period = 14) {
  const rsi = [];
  if (closes.length <= period) {
    return Array(closes.length).fill(NaN);
  }

  // Price differences
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // First average gain/loss (SMA)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Fill initial NaNs
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }
  
  // First valid RSI
  let firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + firstRS));

  // Wilder's smoothing for the remaining data
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

/**
 * Calculates the Stochastic RSI (%K and %D).
 * @param {Array<number>} closes - Closing prices
 * @param {number} rsiPeriod - RSI Period (14)
 * @param {number} stochPeriod - Stochastic Period (14)
 * @param {number} kSmooth - %K Smoothing (3)
 * @param {number} dSmooth - %D Smoothing (3)
 * @returns {{k: Array<number>, d: Array<number>}}
 */
export function calculateStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3) {
  const rsi = calculateRSI(closes, rsiPeriod);
  const stochRsiRaw = [];

  for (let i = 0; i < rsi.length; i++) {
    if (i < rsiPeriod + stochPeriod - 1 || isNaN(rsi[i])) {
      stochRsiRaw.push(NaN);
    } else {
      const windowRsi = rsi.slice(i - stochPeriod + 1, i + 1);
      const minRsi = Math.min(...windowRsi);
      const maxRsi = Math.max(...windowRsi);
      
      const stochRsi = maxRsi === minRsi ? 0 : ((rsi[i] - minRsi) / (maxRsi - minRsi)) * 100;
      stochRsiRaw.push(stochRsi);
    }
  }

  // %K is the SMA of stochRsiRaw with kSmooth periods
  const k = calculateSMA(stochRsiRaw, kSmooth);
  // %D is the SMA of %K with dSmooth periods
  const d = calculateSMA(k, dSmooth);

  return { k, d, rsi };
}

/**
 * Detects divergences in the Stochastic RSI.
 * @param {Array<number>} prices - Closing prices or lows/highs
 * @param {Array<number>} stochRsiK - %K line of the Stochastic RSI
 * @param {number} windowSize - Retrospective analysis window
 * @returns {{type: 'BULLISH' | 'BEARISH' | 'NONE', p1Index: number, p2Index: number}}
 */
export function detectDivergences(prices, stochRsiK, windowSize = 35) {
  const strength = 2; // Number of neighbors on each side to be a pivot
  const pivots = [];

  // Find local pivots in the Price
  for (let i = strength; i < prices.length - strength; i++) {
    if (isNaN(prices[i]) || isNaN(stochRsiK[i])) continue;

    // Local bottom (Low Pivot)
    const isPriceLowPivot = prices[i] < Math.min(...prices.slice(i - strength, i)) && 
                            prices[i] < Math.min(...prices.slice(i + 1, i + strength + 1));
    if (isPriceLowPivot) {
      pivots.push({ index: i, price: prices[i], indicatorVal: stochRsiK[i], type: 'low' });
    }

    // Local top (High Pivot)
    const isPriceHighPivot = prices[i] > Math.max(...prices.slice(i - strength, i)) && 
                             prices[i] > Math.max(...prices.slice(i + 1, i + strength + 1));
    if (isPriceHighPivot) {
      pivots.push({ index: i, price: prices[i], indicatorVal: stochRsiK[i], type: 'high' });
    }
  }

  // Filter the last 2 pivots of each type within the analysis window
  const lowPivots = pivots.filter(p => p.type === 'low').slice(-2);
  const highPivots = pivots.filter(p => p.type === 'high').slice(-2);

  // Check for Bullish Divergence
  if (lowPivots.length === 2) {
    const [p1, p2] = lowPivots;
    if (prices.length - p2.index <= windowSize) {
      // Regular Divergence: Price makes a lower low, but indicator makes a higher low (oversold)
      if (p2.price < p1.price && p2.indicatorVal > p1.indicatorVal && (p2.indicatorVal <= 25 || p1.indicatorVal <= 25)) {
        return { type: 'BULLISH', p1Index: p1.index, p2Index: p2.index };
      }
    }
  }

  // Check for Bearish Divergence
  if (highPivots.length === 2) {
    const [p1, p2] = highPivots;
    if (prices.length - p2.index <= windowSize) {
      // Regular Divergence: Price makes a higher high, but indicator makes a lower high (overbought)
      if (p2.price > p1.price && p2.indicatorVal < p1.indicatorVal && (p2.indicatorVal >= 75 || p1.indicatorVal >= 75)) {
        return { type: 'BEARISH', p1Index: p1.index, p2Index: p2.index };
      }
    }
  }

  return { type: 'NONE', p1Index: -1, p2Index: -1 };
}

/**
 * Detects Fair Value Gaps (FVG) in the candle history.
 * @param {Array} candles - Array of objects containing high and low
 * @returns {Array} Array of unmitigated FVGs
 */
export function detectFVGs(candles) {
  const fvgs = [];

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    // Bullish FVG
    if (c3.low > c1.high) {
      fvgs.push({
        id: `bullish-fvg-${i}`,
        type: 'BULLISH',
        topPrice: c3.low,
        bottomPrice: c1.high,
        startIndex: i - 1,
        isMitigated: false
      });
    }

    // Bearish FVG
    if (c3.high < c1.low) {
      fvgs.push({
        id: `bearish-fvg-${i}`,
        type: 'BEARISH',
        topPrice: c1.low,
        bottomPrice: c3.high,
        startIndex: i - 1,
        isMitigated: false
      });
    }
  }

  // Validate mitigation
  for (let f = 0; f < fvgs.length; f++) {
    const fvg = fvgs[f];
    const checkStartIndex = fvg.startIndex + 2;

    for (let j = checkStartIndex; j < candles.length; j++) {
      if (fvg.type === 'BULLISH' && candles[j].low <= fvg.bottomPrice) {
        fvg.isMitigated = true;
        break;
      }
      if (fvg.type === 'BEARISH' && candles[j].high >= fvg.topPrice) {
        fvg.isMitigated = true;
        break;
      }
    }
  }

  return fvgs.filter(f => !f.isMitigated);
}

/**
 * Finds the main Support and Resistance zones by clustering.
 * @param {Array} candles - Historical candles
 * @returns {{supports: Array<number>, resistances: Array<number>}} Calculated price levels
 */
export function detectSupportResistance(candles) {
  if (candles.length === 0) return { supports: [], resistances: [] };
  
  const currentPrice = candles[candles.length - 1].close;
  const pivots = [];
  const strength = 4; // Most significant pivots (4 neighbor candles)

  // 1. Find Pivots
  for (let i = strength; i < candles.length - strength; i++) {
    const slice = candles.slice(i - strength, i + strength + 1);
    const lows = slice.map(c => c.low);
    const highs = slice.map(c => c.high);

    // Local support
    if (candles[i].low === Math.min(...lows)) {
      pivots.push({ price: candles[i].low, type: 'support', index: i });
    }
    // Local resistance
    if (candles[i].high === Math.max(...highs)) {
      pivots.push({ price: candles[i].high, type: 'resistance', index: i });
    }
  }

  // 2. Count Retests (Touches) for each pivot
  const scoredPivots = pivots.map(p => {
    let touches = 0;
    const threshold = p.price * 0.012; // 1.2% tolerance
    
    // Count retests in all history
    for (let j = 0; j < candles.length; j++) {
      if (j === p.index) continue;
      
      const c = candles[j];
      if (p.type === 'support') {
        // Candle low or body near the level
        if (Math.abs(c.low - p.price) <= threshold || Math.abs(Math.min(c.open, c.close) - p.price) <= threshold) {
          touches++;
        }
      } else {
        // Candle high or body near the level
        if (Math.abs(c.high - p.price) <= threshold || Math.abs(Math.max(c.open, c.close) - p.price) <= threshold) {
          touches++;
        }
      }
    }
    
    return { price: p.price, type: p.type, touches };
  });

  // 3. Merge levels that are very close (within 2% difference)
  // Sort by descending touch count to prioritize stronger levels
  const consolidate = (items) => {
    const consolidated = [];
    const sorted = items.sort((a, b) => b.touches - a.touches);

    for (const item of sorted) {
      const isTooClose = consolidated.some(c => Math.abs(c.price - item.price) / c.price <= 0.02);
      if (!isTooClose) {
        consolidated.push(item);
      }
    }
    return consolidated;
  };

  const allConsolidated = consolidate(scoredPivots);

  // 4. Dynamically sort and filter based on current price (Role Reversal Principle)
  // Supports: ANY consolidated pivot below the current price, sorted from closest to farthest
  const activeSupports = allConsolidated
    .filter(p => p.price < currentPrice)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)
    .map(p => p.price);

  // Resistances: ANY consolidated pivot above the current price, sorted from closest to farthest
  const activeResistances = allConsolidated
    .filter(p => p.price > currentPrice)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map(p => p.price);

  return {
    supports: activeSupports,
    resistances: activeResistances
  };
}

/**
 * Runs the prediction engine combining all indicators and on-chain data.
 * @param {number} currentPrice - Current price of the asset
 * @param {Object} indicators - Calculated EMAs, SMAs, RSI, StochRSI
 * @param {Array} fvgs - Active FVGs
 * @param {Object} sr - Supports and Resistances
 * @param {Object} onchain - On-chain metrics (sthRp, lthRp, mvrvZscore, rainbowBand)
 * @param {string} timeframe - Current timeframe
 * @returns {Object} { score, bias, details }
 */
export function runPredictionEngine(currentPrice, indicators, fvgs, sr, onchain, timeframe = '1w') {
  let score = 0;
  const details = [];

  const timeframeLabels = {
    '3d': '3 Days',
    '1w': 'Weekly',
    '2w': '2 Weeks',
    '1M': 'Monthly'
  };
  const tfLabel = timeframeLabels[timeframe] || timeframe;

  // 1. Moving Averages Trend (Weight: 40%)
  const ema9Val = indicators.ema9[indicators.ema9.length - 1];
  const ema21Val = indicators.ema21[indicators.ema21.length - 1];
  const ema52Val = indicators.ema52[indicators.ema52.length - 1];
  const sma100Val = indicators.sma100[indicators.sma100.length - 1];
  const sma200Val = indicators.sma200[indicators.sma200.length - 1];

  // A) Price above EMA 21
  if (!isNaN(ema21Val)) {
    if (currentPrice > ema21Val) {
      score += 20;
      details.push({ factor: `Price > EMA 21 (${tfLabel}) (Bullish Trend)`, score: 20 });
    } else {
      score -= 20;
      details.push({ factor: `Price < EMA 21 (${tfLabel}) (Bearish Trend)`, score: -20 });
    }
  }

  // B) Averages alignment (9 > 21 > 52)
  if (!isNaN(ema9Val) && !isNaN(ema21Val) && !isNaN(ema52Val)) {
    if (ema9Val > ema21Val && ema21Val > ema52Val) {
      score += 20;
      details.push({ factor: 'Bullish Averages Alignment (9 > 21 > 52)', score: 20 });
    } else if (ema9Val < ema21Val && ema21Val < ema52Val) {
      score -= 20;
      details.push({ factor: 'Bearish Averages Alignment (9 < 21 < 52)', score: -20 });
    } else {
      details.push({ factor: 'Averages in Consolidation / Unaligned', score: 0 });
    }
  }

  // 2. Momentum / Divergence (Weight: 20%)
  const divResult = detectDivergences(indicators.closes, indicators.stochK);
  if (divResult.type === 'BULLISH') {
    score += 10;
    details.push({ factor: 'Bullish Divergence on Stoch RSI Detected', score: 10 });
  } else if (divResult.type === 'BEARISH') {
    score -= 10;
    details.push({ factor: 'Bearish Divergence on Stoch RSI Detected', score: -10 });
  } else {
    details.push({ factor: 'No active divergences on Stoch RSI', score: 0 });
  }

  // RSI exhaustion on selected timeframe
  const rsiVal = indicators.rsi[indicators.rsi.length - 1];
  if (!isNaN(rsiVal)) {
    if (rsiVal < 35) {
      score += 10;
      details.push({ factor: `RSI (${tfLabel}) in Oversold (Seller Exhaustion)`, score: 10 });
    } else if (rsiVal > 70) {
      score -= 10;
      details.push({ factor: `RSI (${tfLabel}) in Overbought (Buyer Exhaustion)`, score: -10 });
    } else {
      details.push({ factor: `RSI (${tfLabel}) in neutral zone`, score: 0 });
    }
  }

  // 3. Price Action: FVG and S/R (Weight: 20%)
  // Check if current price is touching an active Bullish FVG
  const touchingBullishFvg = fvgs.some(f => f.type === 'BULLISH' && currentPrice <= f.topPrice && currentPrice >= f.bottomPrice);
  if (touchingBullishFvg) {
    score += 10;
    details.push({ factor: 'Price in Rebalancing Zone (Bullish FVG)', score: 10 });
  }
  const touchingBearishFvg = fvgs.some(f => f.type === 'BEARISH' && currentPrice <= f.topPrice && currentPrice >= f.bottomPrice);
  if (touchingBearishFvg) {
    score -= 10;
    details.push({ factor: 'Price in Rebalancing Zone (Bearish FVG)', score: -10 });
  }

  // Check if price is close to a key support (within 2%)
  const nearSupport = sr.supports.some(s => Math.abs(currentPrice - s) / s <= 0.02);
  if (nearSupport) {
    score += 10;
    details.push({ factor: 'Price close to Static Support Zone', score: 10 });
  }
  const nearResistance = sr.resistances.some(r => Math.abs(currentPrice - r) / r <= 0.02);
  if (nearResistance) {
    score -= 10;
    details.push({ factor: 'Price close to Static Resistance Zone', score: -10 });
  }

  // 4. On-Chain Confluence (Weight: 20%)
  if (onchain) {
    // Price vs STH-RP
    if (onchain.sthRp) {
      if (currentPrice > onchain.sthRp) {
        score += 10;
        details.push({ factor: 'Price > Short-Term Realized Price (STH-RP)', score: 10 });
      } else {
        score -= 10;
        details.push({ factor: 'Price < Short-Term Realized Price (STH-RP)', score: -10 });
      }
    }
    // MVRV Z-Score
    if (onchain.mvrvZscore !== undefined) {
      if (onchain.mvrvZscore < 0.2) {
        score += 10;
        details.push({ factor: 'MVRV Z-Score Undervalued (< 0.2)', score: 10 });
      } else if (onchain.mvrvZscore > 3.0) {
        score -= 10;
        details.push({ factor: 'MVRV Z-Score Overvalued (> 3.0)', score: -10 });
      }
    }
  }

  // Normalize final score to ensure limit of -100 to +100
  score = Math.max(-100, Math.min(100, score));

  let bias = 'NEUTRAL';
  if (score >= 40) bias = 'BULLISH';
  if (score <= -40) bias = 'BEARISH';

  return {
    score,
    bias,
    details
  };
}
