/**
 * Módulo de indicadores técnicos, detecção de padrões e motor de predição.
 */

/**
 * Calcula a Média Móvel Simples (SMA).
 * @param {Array<number>} data - Dados numéricos (geralmente fechamentos)
 * @param {number} period - Período da média
 * @returns {Array<number>} Array do mesmo tamanho do input, contendo valores ou NaN
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
 * Calcula a Média Móvel Exponencial (EMA).
 * @param {Array<number>} data - Dados numéricos
 * @param {number} period - Período da média
 * @returns {Array<number>} Array contendo valores calculados ou NaN
 */
export function calculateEMA(data, period) {
  const ema = [];
  const k = 2 / (period + 1);
  let prevEma = NaN;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      // O valor inicial é a SMA correspondente
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
 * Calcula o Índice de Força Relativa (RSI) com suavização de Wilder.
 * @param {Array<number>} closes - Preços de fechamento
 * @param {number} period - Período (default: 14)
 * @returns {Array<number>}
 */
export function calculateRSI(closes, period = 14) {
  const rsi = [];
  if (closes.length <= period) {
    return Array(closes.length).fill(NaN);
  }

  // Diferenças de preço
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // Primeiro ganho/perda médio (SMA)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Preencher NaNs iniciais
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }
  
  // Primeiro RSI válido
  let firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + firstRS));

  // Suavização de Wilder para o restante dos dados
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

/**
 * Calcula o Stochastic RSI (%K e %D).
 * @param {Array<number>} closes - Preços de fechamento
 * @param {number} rsiPeriod - Período do RSI (14)
 * @param {number} stochPeriod - Período do Estocástico (14)
 * @param {number} kSmooth - Suavização de %K (3)
 * @param {number} dSmooth - Suavização de %D (3)
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

  // %K é a SMA de stochRsiRaw com kSmooth períodos
  const k = calculateSMA(stochRsiRaw, kSmooth);
  // %D é a SMA de %K com dSmooth períodos
  const d = calculateSMA(k, dSmooth);

  return { k, d, rsi };
}

/**
 * Detecta divergências no Stochastic RSI.
 * @param {Array<number>} prices - Preços de fechamento ou mínimas/máximas
 * @param {Array<number>} stochRsiK - Linha %K do Stochastic RSI
 * @param {number} windowSize - Janela de análise retrospectiva
 * @returns {{type: 'BULLISH' | 'BEARISH' | 'NONE', p1Index: number, p2Index: number}}
 */
export function detectDivergences(prices, stochRsiK, windowSize = 35) {
  const strength = 2; // Número de vizinhos de cada lado para ser pivô
  const pivots = [];

  // Encontrar Pivôs locais no Preço
  for (let i = strength; i < prices.length - strength; i++) {
    if (isNaN(prices[i]) || isNaN(stochRsiK[i])) continue;

    // Fundo local (Low Pivot)
    const isPriceLowPivot = prices[i] < Math.min(...prices.slice(i - strength, i)) && 
                            prices[i] < Math.min(...prices.slice(i + 1, i + strength + 1));
    if (isPriceLowPivot) {
      pivots.push({ index: i, price: prices[i], indicatorVal: stochRsiK[i], type: 'low' });
    }

    // Topo local (High Pivot)
    const isPriceHighPivot = prices[i] > Math.max(...prices.slice(i - strength, i)) && 
                             prices[i] > Math.max(...prices.slice(i + 1, i + strength + 1));
    if (isPriceHighPivot) {
      pivots.push({ index: i, price: prices[i], indicatorVal: stochRsiK[i], type: 'high' });
    }
  }

  // Filtrar os 2 últimos pivôs de cada tipo dentro da janela de análise
  const lowPivots = pivots.filter(p => p.type === 'low').slice(-2);
  const highPivots = pivots.filter(p => p.type === 'high').slice(-2);

  // Verificar Divergência Bullish (Alta)
  if (lowPivots.length === 2) {
    const [p1, p2] = lowPivots;
    if (prices.length - p2.index <= windowSize) {
      // Divergência Regular: Preço faz fundo mais baixo, mas indicador faz fundo mais alto (sobrevenda)
      if (p2.price < p1.price && p2.indicatorVal > p1.indicatorVal && (p2.indicatorVal <= 25 || p1.indicatorVal <= 25)) {
        return { type: 'BULLISH', p1Index: p1.index, p2Index: p2.index };
      }
    }
  }

  // Verificar Divergência Bearish (Baixa)
  if (highPivots.length === 2) {
    const [p1, p2] = highPivots;
    if (prices.length - p2.index <= windowSize) {
      // Divergência Regular: Preço faz topo mais alto, mas indicador faz topo mais baixo (sobrecompra)
      if (p2.price > p1.price && p2.indicatorVal < p1.indicatorVal && (p2.indicatorVal >= 75 || p1.indicatorVal >= 75)) {
        return { type: 'BEARISH', p1Index: p1.index, p2Index: p2.index };
      }
    }
  }

  return { type: 'NONE', p1Index: -1, p2Index: -1 };
}

/**
 * Detecta Fair Value Gaps (FVG) no histórico de velas.
 * @param {Array} candles - Array de objetos contendo high e low
 * @returns {Array} Array de FVGs não mitigados
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

  // Validar mitigação
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
 * Encontra as principais zonas de Suporte e Resistência por agrupamento (clustering).
 * @param {Array} candles - Velas históricas
 * @returns {{supports: Array<number>, resistances: Array<number>}} Níveis de preços calculados
 */
export function detectSupportResistance(candles) {
  const pivots = [];
  const strength = 3;

  for (let i = strength; i < candles.length - strength; i++) {
    const lows = candles.slice(i - strength, i + strength + 1).map(c => c.low);
    const highs = candles.slice(i - strength, i + strength + 1).map(c => c.high);

    // Suporte local
    if (candles[i].low === Math.min(...lows)) {
      pivots.push({ price: candles[i].low, type: 'support' });
    }
    // Resistência local
    if (candles[i].high === Math.max(...highs)) {
      pivots.push({ price: candles[i].high, type: 'resistance' });
    }
  }

  // Agrupar níveis de preço próximos (dentro de 2% de diferença)
  const groupLevels = (items) => {
    if (items.length === 0) return [];
    
    const sorted = items.map(item => item.price).sort((a, b) => a - b);
    const groups = [];
    let currentGroup = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const diff = (sorted[i] - sorted[i - 1]) / sorted[i - 1];
      if (diff <= 0.02) {
        currentGroup.push(sorted[i]);
      } else {
        groups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
        currentGroup = [sorted[i]];
      }
    }
    groups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
    return groups;
  };

  const rawSupports = pivots.filter(p => p.type === 'support');
  const rawResistances = pivots.filter(p => p.type === 'resistance');

  return {
    supports: groupLevels(rawSupports),
    resistances: groupLevels(rawResistances)
  };
}

/**
 * Roda o motor de predição combinando todos os indicadores e dados on-chain.
 * @param {number} currentPrice - Preço atual do ativo
 * @param {Object} indicators - EMAs, SMAs, RSI, StochRSI calculados
 * @param {Array} fvgs - FVGs ativos
 * @param {Object} sr - Suportes e Resistências
 * @param {Object} onchain - Métricas Onchain (sthRp, lthRp, mvrvZscore, rainbowBand)
 * @returns {Object} { score, bias, details }
 */
export function runPredictionEngine(currentPrice, indicators, fvgs, sr, onchain) {
  let score = 0;
  const details = [];

  // 1. Tendência de Médias Móveis (Peso: 40%)
  const ema9Val = indicators.ema9[indicators.ema9.length - 1];
  const ema21Val = indicators.ema21[indicators.ema21.length - 1];
  const ema52Val = indicators.ema52[indicators.ema52.length - 1];
  const sma100Val = indicators.sma100[indicators.sma100.length - 1];
  const sma200Val = indicators.sma200[indicators.sma200.length - 1];

  // A) Preço acima da EMA 21 Semanal
  if (!isNaN(ema21Val)) {
    if (currentPrice > ema21Val) {
      score += 20;
      details.push({ factor: 'Preço > EMA 21 Semanal (Tendência Bullish)', score: 20 });
    } else {
      score -= 20;
      details.push({ factor: 'Preço < EMA 21 Semanal (Tendência Bearish)', score: -20 });
    }
  }

  // B) Alinhamento de médias (9 > 21 > 52)
  if (!isNaN(ema9Val) && !isNaN(ema21Val) && !isNaN(ema52Val)) {
    if (ema9Val > ema21Val && ema21Val > ema52Val) {
      score += 20;
      details.push({ factor: 'Alinhamento de Médias Bullish (9 > 21 > 52)', score: 20 });
    } else if (ema9Val < ema21Val && ema21Val < ema52Val) {
      score -= 20;
      details.push({ factor: 'Alinhamento de Médias Bearish (9 < 21 < 52)', score: -20 });
    } else {
      details.push({ factor: 'Médias em Consolidação / Sem Alinhamento', score: 0 });
    }
  }

  // 2. Momento / Divergência (Peso: 20%)
  const divResult = detectDivergences(indicators.closes, indicators.stochK);
  if (divResult.type === 'BULLISH') {
    score += 10;
    details.push({ factor: 'Divergência Bullish no Stoch RSI Detectada', score: 10 });
  } else if (divResult.type === 'BEARISH') {
    score -= 10;
    details.push({ factor: 'Divergência Bearish no Stoch RSI Detectada', score: -10 });
  } else {
    details.push({ factor: 'Sem divergências ativas no Stoch RSI', score: 0 });
  }

  // RSI Semanal exaustão
  const rsiVal = indicators.rsi[indicators.rsi.length - 1];
  if (!isNaN(rsiVal)) {
    if (rsiVal < 35) {
      score += 10;
      details.push({ factor: 'RSI Semanal em Sobrevenda (Exaustão de Venda)', score: 10 });
    } else if (rsiVal > 70) {
      score -= 10;
      details.push({ factor: 'RSI Semanal em Sobrecompra (Exaustão de Compra)', score: -10 });
    } else {
      details.push({ factor: 'RSI em zona neutra', score: 0 });
    }
  }

  // 3. Price Action: FVG e S/R (Peso: 20%)
  // Verificar se o preço atual está tocando um Bullish FVG ativo
  const touchingBullishFvg = fvgs.some(f => f.type === 'BULLISH' && currentPrice <= f.topPrice && currentPrice >= f.bottomPrice);
  if (touchingBullishFvg) {
    score += 10;
    details.push({ factor: 'Preço em Zona de Rebalanceamento (Bullish FVG)', score: 10 });
  }
  const touchingBearishFvg = fvgs.some(f => f.type === 'BEARISH' && currentPrice <= f.topPrice && currentPrice >= f.bottomPrice);
  if (touchingBearishFvg) {
    score -= 10;
    details.push({ factor: 'Preço em Zona de Rebalanceamento (Bearish FVG)', score: -10 });
  }

  // Verificar se o preço está próximo a um suporte chave (dentro de 2%)
  const nearSupport = sr.supports.some(s => Math.abs(currentPrice - s) / s <= 0.02);
  if (nearSupport) {
    score += 10;
    details.push({ factor: 'Preço próximo à Zona de Suporte Estática', score: 10 });
  }
  const nearResistance = sr.resistances.some(r => Math.abs(currentPrice - r) / r <= 0.02);
  if (nearResistance) {
    score -= 10;
    details.push({ factor: 'Preço próximo à Zona de Resistência Estática', score: -10 });
  }

  // 4. Confluência On-Chain (Peso: 20%)
  if (onchain) {
    // Preço vs STH-RP
    if (onchain.sthRp) {
      if (currentPrice > onchain.sthRp) {
        score += 10;
        details.push({ factor: 'Preço > Realized Price de Curto Prazo (STH-RP)', score: 10 });
      } else {
        score -= 10;
        details.push({ factor: 'Preço < Realized Price de Curto Prazo (STH-RP)', score: -10 });
      }
    }
    // MVRV Z-Score
    if (onchain.mvrvZscore !== undefined) {
      if (onchain.mvrvZscore < 0.2) {
        score += 10;
        details.push({ factor: 'MVRV Z-Score Subvalorizado (< 0.2)', score: 10 });
      } else if (onchain.mvrvZscore > 3.0) {
        score -= 10;
        details.push({ factor: 'MVRV Z-Score Sobrevalorizado (> 3.0)', score: -10 });
      }
    }
  }

  // Normalizar score final para garantir limite de -100 a +100
  score = Math.max(-100, Math.min(100, score));

  let bias = 'NEUTRO';
  if (score >= 40) bias = 'BULLISH';
  if (score <= -40) bias = 'BEARISH';

  return {
    score,
    bias,
    details
  };
}
