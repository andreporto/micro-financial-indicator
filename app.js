import { getCandleData } from './src/aggregator.js';
import { 
  calculateEMA, 
  calculateSMA, 
  calculateStochRSI, 
  detectFVGs, 
  detectSupportResistance, 
  runPredictionEngine,
  detectDivergences
} from './src/indicators.js';

// Global App State
let currentAsset = 'BTC';
let currentTimeframe = '1w';

// Chart and Series References
let priceChart = null;
let rsiChart = null;
let stochChart = null;
let candlestickSeries = null;
let ema9Series = null;
let ema21Series = null;
let ema52Series = null;
let sma100Series = null;
let sma200Series = null;
let rsiSeries = null;
let stochKSeries = null;
let stochDSeries = null;
let activePriceLines = [];

// Indicator Colors
const COLORS = {
  ema9: '#3b82f6',   // Blue
  ema21: '#f59e0b',  // Orange
  ema52: '#10b981',  // Green
  sma100: '#8b5cf6', // Purple
  sma200: '#ef4444'  // Red
};

// High Fidelity Simulated On-Chain Data (based on current price)
function getSimulatedOnChainData(asset, price) {
  if (asset === 'BTC') {
    return {
      sthRp: price * 0.88,
      lthRp: price * 0.58,
      mvrvZscore: 1.45,
      rainbowBand: 'Accumulate'
    };
  } else if (asset === 'ETH') {
    return {
      sthRp: price * 0.84,
      lthRp: price * 0.52,
      mvrvZscore: 1.15,
      rainbowBand: 'Still Cheap'
    };
  } else { // SOL
    return {
      sthRp: price * 0.79,
      lthRp: price * 0.44,
      mvrvZscore: 1.95,
      rainbowBand: 'HODL!'
    };
  }
}

/**
 * Initializes TradingView charts.
 */
function initCharts() {
  const priceContainer = document.getElementById('price-chart-container');
  const rsiContainer = document.getElementById('rsi-chart-container');
  const stochContainer = document.getElementById('stoch-chart-container');

  if (!priceContainer || !rsiContainer || !stochContainer) return;

  // Clear containers if charts already exist
  priceContainer.innerHTML = '';
  rsiContainer.innerHTML = '';
  stochContainer.innerHTML = '';

  const chartOptions = {
    layout: {
      background: { type: LightweightCharts.ColorType.Solid, color: '#0e1626' }, // bg-secondary
      textColor: '#94a3b8', // text-secondary
      fontFamily: 'Inter, sans-serif',
    },
    grid: {
      vertLines: { color: 'rgba(32, 46, 72, 0.2)' },
      horzLines: { color: 'rgba(32, 46, 72, 0.2)' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#2563eb' },
      horzLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#2563eb' },
    },
    timeScale: {
      borderColor: '#202e48',
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 5,
    },
    rightPriceScale: {
      borderColor: '#202e48',
      visible: true,
    },
    leftPriceScale: {
      visible: false,
    }
  };

  // 1. Create Main Price Chart
  priceChart = LightweightCharts.createChart(priceContainer, {
    ...chartOptions,
    width: priceContainer.clientWidth,
    height: priceContainer.clientHeight,
  });

  candlestickSeries = priceChart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#10b981',
    downColor: '#ef4444',
    borderVisible: false,
    wickUpColor: '#10b981',
    wickDownColor: '#ef4444',
    priceLineColor: '#f59e0b', // Amber for current price
    priceLineVisible: true,
    lastValueVisible: true,
  });

  // Moving averages lines
  ema9Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.ema9, lineWidth: 1.5, crosshairMarkerVisible: false, lastValueVisible: true, priceLineVisible: false });
  ema21Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.ema21, lineWidth: 1.5, crosshairMarkerVisible: false, lastValueVisible: true, priceLineVisible: false });
  ema52Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.ema52, lineWidth: 1.5, crosshairMarkerVisible: false, lastValueVisible: true, priceLineVisible: false });
  sma100Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.sma100, lineWidth: 2, crosshairMarkerVisible: false, lastValueVisible: true, priceLineVisible: false });
  sma200Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.sma200, lineWidth: 2.5, crosshairMarkerVisible: false, lastValueVisible: true, priceLineVisible: false });

  // 2. Create RSI Chart
  rsiChart = LightweightCharts.createChart(rsiContainer, {
    ...chartOptions,
    width: rsiContainer.clientWidth,
    height: rsiContainer.clientHeight,
  });

  rsiSeries = rsiChart.addSeries(LightweightCharts.LineSeries, { color: '#8b5cf6', lineWidth: 1.5, title: 'RSI' });
  rsiSeries.createPriceLine({ price: 30, color: 'rgba(148, 163, 184, 0.3)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true });
  rsiSeries.createPriceLine({ price: 70, color: 'rgba(148, 163, 184, 0.3)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true });

  // 3. Create Secondary Chart (Stochastic RSI)
  stochChart = LightweightCharts.createChart(stochContainer, {
    ...chartOptions,
    width: stochContainer.clientWidth,
    height: stochContainer.clientHeight,
  });

  stochKSeries = stochChart.addSeries(LightweightCharts.LineSeries, { color: '#3b82f6', lineWidth: 1.5, title: '%K' });
  stochDSeries = stochChart.addSeries(LightweightCharts.LineSeries, { color: '#f59e0b', lineWidth: 1.5, title: '%D' });

  // Add Stochastic RSI limits (20 and 80)
  stochKSeries.createPriceLine({ price: 20, color: 'rgba(148, 163, 184, 0.3)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true });
  stochKSeries.createPriceLine({ price: 80, color: 'rgba(148, 163, 184, 0.3)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true });

  // Sync time scales of the three charts bidirectionally (Zoom & Scroll)
  let isReflecting = false;
  const syncCharts = (sourceChart, targets) => {
    sourceChart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (isReflecting) return;
      isReflecting = true;
      targets.forEach(target => {
        if (logicalRange !== null) {
          target.timeScale().setVisibleLogicalRange(logicalRange);
        }
      });
      isReflecting = false;
    });
  };

  syncCharts(priceChart, [rsiChart, stochChart]);
  syncCharts(rsiChart, [priceChart, stochChart]);
  syncCharts(stochChart, [priceChart, rsiChart]);

  // Adjust responsiveness
  const resizeObserver = new ResizeObserver(() => {
    if (priceChart && rsiChart && stochChart) {
      priceChart.resize(priceContainer.clientWidth, priceContainer.clientHeight);
      rsiChart.resize(rsiContainer.clientWidth, rsiContainer.clientHeight);
      stochChart.resize(stochContainer.clientWidth, stochContainer.clientHeight);
    }
  });
  resizeObserver.observe(priceContainer);
}

/**
 * Reloads and renders data on charts and panels based on selections.
 */
async function refreshDashboard() {
  const chartsWrapper = document.querySelector('.charts-wrapper');
  const predModule = document.getElementById('estrategia');

  if (chartsWrapper) chartsWrapper.classList.add('loading');
  if (predModule) predModule.classList.add('loading');

  try {
    document.getElementById('current-asset-title').innerText = `${currentAsset === 'BTC' ? 'Bitcoin' : currentAsset === 'ETH' ? 'Ethereum' : 'Solana'} (${currentAsset}/USD)`;
    document.getElementById('current-timeframe-badge').innerText = currentTimeframe;

    // 1. Get market candles
    const candles = await getCandleData(currentAsset, currentTimeframe);
    if (!candles || candles.length === 0) return;

    // Force resize based on real container size to avoid 0px width
    const priceContainer = document.getElementById('price-chart-container');
    const rsiContainer = document.getElementById('rsi-chart-container');
    const stochContainer = document.getElementById('stoch-chart-container');
    if (priceChart && priceContainer) {
      priceChart.resize(priceContainer.clientWidth || 800, priceContainer.clientHeight || 340);
    }
    if (rsiChart && rsiContainer) {
      rsiChart.resize(rsiContainer.clientWidth || 800, rsiContainer.clientHeight || 150);
    }
    if (stochChart && stochContainer) {
      stochChart.resize(stochContainer.clientWidth || 800, stochContainer.clientHeight || 150);
    }

    const closes = candles.map(c => c.close);
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    // Update Price header
    const currentPrice = lastCandle.close;
    const priceChange = ((currentPrice - prevCandle.close) / prevCandle.close) * 100;
    
    document.getElementById('current-price-val').innerText = `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const changeBadge = document.getElementById('price-change-val');
    changeBadge.innerText = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
    changeBadge.className = `price-change-percent ${priceChange >= 0 ? 'bullish' : 'bearish'}`;

    // 2. Calculate Technical Indicators
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema52 = calculateEMA(closes, 52);
    const sma100 = calculateSMA(closes, 100);
    const sma200 = calculateSMA(closes, 200);

    const stochRsi = calculateStochRSI(closes, 14, 14, 3, 3);
    const fvgs = detectFVGs(candles);
    const srLevels = detectSupportResistance(candles);

    // 3. Feed TradingView Series
    candlestickSeries.setData(candles);
    
    // Plot averages if checked in the checkbox
    updateIndicatorVisibility(ema9, ema21, ema52, sma100, sma200);

    // Map RSI and Stochastic RSI data aligned with whitespace points
    const rsiData = [];
    const stochKData = [];
    const stochDData = [];
    for (let i = 0; i < candles.length; i++) {
      const timeVal = candles[i].time;
      
      // RSI
      if (!isNaN(stochRsi.rsi[i]) && stochRsi.rsi[i] !== null) {
        rsiData.push({ time: timeVal, value: stochRsi.rsi[i] });
      } else {
        rsiData.push({ time: timeVal });
      }
      
      // %K
      if (!isNaN(stochRsi.k[i]) && stochRsi.k[i] !== null) {
        stochKData.push({ time: timeVal, value: stochRsi.k[i] });
      } else {
        stochKData.push({ time: timeVal });
      }
      
      // %D
      if (!isNaN(stochRsi.d[i]) && stochRsi.d[i] !== null) {
        stochDData.push({ time: timeVal, value: stochRsi.d[i] });
      } else {
        stochDData.push({ time: timeVal });
      }
    }
    rsiSeries.setData(rsiData);
    stochKSeries.setData(stochKData);
    stochDSeries.setData(stochDData);

    // Force scroll of time scales to the right edge (last visible candles)
    setTimeout(() => {
      if (priceChart) priceChart.timeScale().scrollToPosition(0, false);
      if (rsiChart) rsiChart.timeScale().scrollToPosition(0, false);
      if (stochChart) stochChart.timeScale().scrollToPosition(0, false);
    }, 50);

    // 4. Clear and Plot Support/Resistance (S/R) Lines
    activePriceLines.forEach(line => candlestickSeries.removePriceLine(line));
    activePriceLines = [];

    const showSR = document.getElementById('toggle-sr').checked;
    if (showSR) {
      // Add closest Supports (green) and Resistances (red)
      srLevels.supports.forEach(level => {
        const line = candlestickSeries.createPriceLine({
          price: level,
          color: 'rgba(16, 185, 129, 0.35)',
          lineWidth: 1,
          lineStyle: LightweightCharts.LineStyle.Dotted,
          axisLabelVisible: true,
          title: '',
        });
        activePriceLines.push(line);
      });

      srLevels.resistances.forEach(level => {
        const line = candlestickSeries.createPriceLine({
          price: level,
          color: 'rgba(239, 68, 68, 0.35)',
          lineWidth: 1,
          lineStyle: LightweightCharts.LineStyle.Dotted,
          axisLabelVisible: true,
          title: '',
        });
        activePriceLines.push(line);
      });
    }

    // 5. Collection and update of On-Chain data
    const onchain = getSimulatedOnChainData(currentAsset, currentPrice);
    
    // Update On-Chain Sidebar (Defensive)
    const sidebarMvrv = document.getElementById('sidebar-mvrv-val');
    const sidebarRainbow = document.getElementById('sidebar-rainbow-val');
    const sidebarSth = document.getElementById('sidebar-sth-val');

    if (sidebarMvrv) {
      sidebarMvrv.innerText = `${onchain.mvrvZscore.toFixed(2)} (${onchain.mvrvZscore < 0.5 ? 'Undervalued' : onchain.mvrvZscore > 2.0 ? 'Overvalued' : 'Neutral'})`;
      sidebarMvrv.className = `val ${onchain.mvrvZscore < 0.5 ? 'text-green' : onchain.mvrvZscore > 2.0 ? 'text-red' : 'text-blue'}`;
    }
    
    if (sidebarRainbow) {
      sidebarRainbow.innerText = onchain.rainbowBand;
      sidebarRainbow.className = `val ${onchain.rainbowBand.includes('Accumulate') || onchain.rainbowBand.includes('Cheap') ? 'text-green' : 'text-blue'}`;
    }
    
    if (sidebarSth) {
      const pctToSth = ((currentPrice - onchain.sthRp) / onchain.sthRp) * 100;
      sidebarSth.innerText = `${pctToSth >= 0 ? '+' : ''}${pctToSth.toFixed(1)}%`;
      sidebarSth.className = `val ${pctToSth >= 0 ? 'text-green' : 'text-red'}`;
    }

    // 6. Run the Prediction Engine (SCM)
    const prediction = runPredictionEngine(
      currentPrice,
      { closes, ema9, ema21, ema52, sma100, sma200, rsi: stochRsi.rsi, stochK: stochRsi.k },
      fvgs,
      srLevels,
      onchain,
      currentTimeframe
    );

    // Update Prediction UI
    updatePredictionUI(prediction, currentPrice, onchain, fvgs, srLevels, ema21[ema21.length - 1]);

  } catch (error) {
    console.error("Error updating the analytical dashboard:", error);
  } finally {
    if (chartsWrapper) chartsWrapper.classList.remove('loading');
    if (predModule) predModule.classList.remove('loading');
  }
}

/**
 * Updates the visual state of the moving average lines according to the checkboxes.
 */
function updateIndicatorVisibility(ema9, ema21, ema52, sma100, sma200) {
  const mapData = (values, sourceCandles) => {
    const data = [];
    for (let i = 0; i < values.length; i++) {
      if (!isNaN(values[i])) {
        data.push({ time: sourceCandles[i].time, value: values[i] });
      }
    }
    return data;
  };

  // Get checkboxes state
  const showEma9 = document.getElementById('toggle-ema9').checked;
  const showEma21 = document.getElementById('toggle-ema21').checked;
  const showEma52 = document.getElementById('toggle-ema52').checked;
  const showSma100 = document.getElementById('toggle-sma100').checked;
  const showSma200 = document.getElementById('toggle-sma200').checked;

  // Collects data
  getCandleData(currentAsset, currentTimeframe).then(candles => {
    ema9Series.setData(showEma9 ? mapData(ema9, candles) : []);
    ema21Series.setData(showEma21 ? mapData(ema21, candles) : []);
    ema52Series.setData(showEma52 ? mapData(ema52, candles) : []);
    sma100Series.setData(showSma100 ? mapData(sma100, candles) : []);
    sma200Series.setData(showSma200 ? mapData(sma200, candles) : []);
  });
}

/**
 * Updates the lower 2-Month Prediction panel.
 */
function updatePredictionUI(prediction, currentPrice, onchain, fvgs, srLevels, lastEma21) {
  // 1. Update Score and Radial Progress Circle
  const scoreNum = prediction.score;
  const absScore = Math.abs(scoreNum);
  document.getElementById('pred-score-number').innerText = `${scoreNum >= 0 ? '+' : ''}${scoreNum}`;
  
  // Update radial progress bar
  const strokeOffset = 251.2 - (251.2 * absScore) / 100;
  const progressBar = document.getElementById('score-progress');
  progressBar.style.strokeDashoffset = strokeOffset;
  
  // Change circle color based on score
  if (scoreNum >= 40) {
    progressBar.style.stroke = '#10b981'; // Green
  } else if (scoreNum <= -40) {
    progressBar.style.stroke = '#ef4444'; // Red
  } else {
    progressBar.style.stroke = '#3b82f6'; // Blue
  }

  // 2. Update the Bias Badge
  const biasBadge = document.getElementById('pred-bias-badge');
  biasBadge.innerText = prediction.bias;
  biasBadge.className = `prediction-bias-badge ${prediction.bias.toLowerCase()}`;

  // 3. Elaborate Thesis and Buy/Target Zones
  const timeframeLabels = {
    '3d': '3 Days',
    '1w': 'Weekly',
    '2w': '2 Weeks',
    '1M': 'Monthly'
  };
  const tfLabel = timeframeLabels[currentTimeframe] || currentTimeframe;

  let thesis = '';
  let buyZone = '';
  let targetZone = '';
  let stopZone = '';

  if (prediction.bias === 'BULLISH') {
    thesis = `The SCM engine detects strong bullish confluence on asset ${currentAsset} based on the ${tfLabel} timeframe. The macro HTF trend is aligned upward, with the price above the EMA 21 (${tfLabel}) and maintaining support above the STH-RP ($${Math.round(onchain.sthRp).toLocaleString()}). It is recommended to take advantage of local corrections for accumulation at key technical support limits.`;
    buyZone = `$${Math.round(onchain.sthRp).toLocaleString()} (STH-RP) to $${Math.round(currentPrice * 0.95).toLocaleString()}`;
    
    // Target: First resistance above price
    const targets = srLevels.resistances.filter(r => r > currentPrice);
    targetZone = targets.length > 0 ? `$${Math.round(targets[0]).toLocaleString()}` : `$${Math.round(currentPrice * 1.25).toLocaleString()}`;
    
    // Stop: LTH-RP or below
    stopZone = `$${Math.round(onchain.lthRp).toLocaleString()} (Macro LTH-RP invalidation)`;
  } else if (prediction.bias === 'BEARISH') {
    thesis = `The SCM engine points to a significant negative bias for the next 2 months on asset ${currentAsset} based on the ${tfLabel} timeframe. The price broke crucial supports and is trading below the STH-RP ($${Math.round(onchain.sthRp).toLocaleString()}), signaling institutional exhaustion. Bearish rebalancing zones (FVGs) may act as strong resistances in the short term.`;
    buyZone = `Stay in cash / Wait for capitulation`;
    
    // Downside target: Next support or LTH-RP
    const supports = srLevels.supports.filter(s => s < currentPrice);
    targetZone = supports.length > 0 ? `$${Math.round(supports[supports.length - 1]).toLocaleString()} (Next support)` : `$${Math.round(onchain.lthRp).toLocaleString()}`;
    
    // Stop: Invalidation above the EMA 21
    const activeEma21 = lastEma21 && !isNaN(lastEma21) ? lastEma21 : currentPrice * 1.08;
    stopZone = `$${Math.round(activeEma21).toLocaleString()} (Close above EMA 21 on the ${tfLabel.toLowerCase()} timeframe)`;
  } else {
    thesis = `The ${currentAsset} market is in consolidation/lateral movement on the ${tfLabel} timeframe. The SCM engine score is balanced. The moving averages indicate accommodation and there are no strong active divergence triggers at the moment. Channel trading and strategic patience are recommended.`;
    buyZone = `Trade only at the S/R channel boundaries`;
    targetZone = `Local resistances ($${Math.round(currentPrice * 1.05).toLocaleString()})`;
    stopZone = `Break of the consolidation channel`;
  }

  document.getElementById('pred-thesis-text').innerText = thesis;
  document.getElementById('pred-buy-zone').innerText = buyZone;
  document.getElementById('pred-target-zone').innerText = targetZone;
  document.getElementById('pred-stop-zone').innerText = stopZone;

  // Update top Hero values (for the BTC asset)
  if (currentAsset === 'BTC') {
    document.getElementById('hero-score-val').innerText = `${scoreNum >= 0 ? '+' : ''}${scoreNum} / 100`;
    document.getElementById('hero-score-val').className = `stat-val ${prediction.bias === 'BULLISH' ? 'bullish' : prediction.bias === 'BEARISH' ? 'bearish' : 'text-blue'}`;
    
    const heroBias = document.getElementById('hero-bias-val');
    heroBias.innerText = prediction.bias;
    heroBias.className = `status-${prediction.bias.toLowerCase()}`;
  }

  // 4. Fill confluence factors table
  const tbody = document.querySelector('#scoring-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    prediction.details.forEach(item => {
      const tr = document.createElement('tr');
      
      const tdFactor = document.createElement('td');
      tdFactor.innerText = item.factor;
      
      const tdScore = document.createElement('td');
      if (item.score > 0) {
        tdScore.innerText = `+${item.score}`;
        tdScore.className = 'score-plus';
      } else if (item.score < 0) {
        tdScore.innerText = `${item.score}`;
        tdScore.className = 'score-minus';
      } else {
        tdScore.innerText = '0';
        tdScore.className = 'text-muted';
      }

      tr.appendChild(tdFactor);
      tr.appendChild(tdScore);
      tbody.appendChild(tr);
    });
  }

  // 5. Update Expanded On-Chain Tab
  const rainbowText = document.getElementById('onchain-rainbow-band');
  if (rainbowText) rainbowText.innerText = onchain.rainbowBand;

  // Update active segment of the Rainbow Chart
  let bandIndex = 4;
  const band = onchain.rainbowBand;
  if (band.includes('Maximum Bubble') || band.includes('Sell')) bandIndex = 0;
  else if (band.includes('Bubble') || band.includes('FOMO')) bandIndex = 1;
  else if (band.includes('Bubble?')) bandIndex = 2;
  else if (band.includes('HODL')) bandIndex = 3;
  else if (band.includes('Still Cheap')) bandIndex = 4;
  else if (band.includes('Accumulate')) bandIndex = 5;
  else if (band.includes('Buy')) bandIndex = 6;
  else if (band.includes('Fire Sale')) bandIndex = 7;

  const segments = document.querySelectorAll('.rainbow-segment');
  segments.forEach((s, idx) => {
    if (idx === bandIndex) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });

  // Update MVRV Z-Score
  const mvrvText = document.getElementById('onchain-mvrv-score');
  if (mvrvText) mvrvText.innerText = onchain.mvrvZscore.toFixed(2);

  const mvrvFill = document.getElementById('onchain-mvrv-progress');
  if (mvrvFill) {
    const pct = Math.min(100, Math.max(0, (onchain.mvrvZscore / 3.5) * 100));
    mvrvFill.style.width = `${pct}%`;
  }

  // Update Realized Prices
  const sthText = document.getElementById('onchain-sth-rp');
  if (sthText) sthText.innerText = `$${Math.round(onchain.sthRp).toLocaleString()}`;

  const lthText = document.getElementById('onchain-lth-rp');
  if (lthText) lthText.innerText = `$${Math.round(onchain.lthRp).toLocaleString()}`;

  const relationText = document.getElementById('onchain-realized-relation');
  if (relationText) {
    if (currentPrice > onchain.sthRp && onchain.sthRp > onchain.lthRp) {
      relationText.innerText = "Price is above both acquisition costs (STH-RP and LTH-RP), confirming a healthy bullish structure.";
      relationText.className = "realized-price-status"; // Green/Bullish
    } else if (currentPrice < onchain.sthRp && currentPrice > onchain.lthRp) {
      relationText.innerText = "Price has lost the short-term support (STH-RP) but remains above the long-term support (LTH-RP). Consolidation alert.";
      relationText.className = "realized-price-status text-blue"; // Blue/Neutral
      relationText.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
      relationText.style.borderColor = "rgba(59, 130, 246, 0.2)";
    } else {
      relationText.innerText = "Price is below both costs (LTH-RP and STH-RP). Historical bear market capitulation phase.";
      relationText.className = "realized-price-status text-red"; // Red/Bearish
      relationText.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
      relationText.style.borderColor = "rgba(239, 68, 68, 0.2)";
    }
  }
}

/**
 * Interface Event Listeners Configuration.
 */
function setupEventListeners() {
  // Asset Listeners (Sidebar)
  const assetButtons = document.querySelectorAll('#asset-selector .selector-btn');
  assetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      assetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAsset = btn.dataset.asset;
      refreshDashboard();
    });
  });

  // Timeframe Listeners (Sidebar)
  const timeframeButtons = document.querySelectorAll('#timeframe-selector .selector-btn');
  timeframeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      timeframeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTimeframe = btn.dataset.timeframe;
      refreshDashboard();
    });
  });

  // Averages visibility checkboxes
  const checkboxes = ['toggle-ema9', 'toggle-ema21', 'toggle-ema52', 'toggle-sma100', 'toggle-sma200'];
  checkboxes.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      // Recalculate averages from current candles
      getCandleData(currentAsset, currentTimeframe).then(candles => {
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        const ema52 = calculateEMA(closes, 52);
        const sma100 = calculateSMA(closes, 100);
        const sma200 = calculateSMA(closes, 200);
        updateIndicatorVisibility(ema9, ema21, ema52, sma100, sma200);
      });
    });
  });

  // S/R visibility checkbox
  const toggleSR = document.getElementById('toggle-sr');
  if (toggleSR) {
    toggleSR.addEventListener('change', () => {
      refreshDashboard();
    });
  }

  // General Documentation Tabs
  const tabButtons = document.querySelectorAll('#docs-tabs .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      const panels = document.querySelectorAll('.tab-panel');
      panels.forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  // Main Tabs (Navbar)
  const mainTabButtons = document.querySelectorAll('#main-tabs .tab-link');
  mainTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      mainTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.mainTab;
      const panels = document.querySelectorAll('.main-panel');
      panels.forEach(p => p.classList.remove('active'));
      
      const targetPanel = document.getElementById(`panel-${targetTab}`);
      if (targetPanel) targetPanel.classList.add('active');

      // If the tab is the dashboard, force resize of the charts to calculate the visible layout
      if (targetTab === 'dashboard') {
        setTimeout(() => {
          const priceContainer = document.getElementById('price-chart-container');
          const rsiContainer = document.getElementById('rsi-chart-container');
          const stochContainer = document.getElementById('stoch-chart-container');
          if (priceChart && priceContainer) {
            priceChart.resize(priceContainer.clientWidth || 800, priceContainer.clientHeight || 340);
            priceChart.timeScale().scrollToPosition(0, false);
          }
          if (rsiChart && rsiContainer) {
            rsiChart.resize(rsiContainer.clientWidth || 800, rsiContainer.clientHeight || 150);
            rsiChart.timeScale().scrollToPosition(0, false);
          }
          if (stochChart && stochContainer) {
            stochChart.resize(stochContainer.clientWidth || 800, stochContainer.clientHeight || 150);
            stochChart.timeScale().scrollToPosition(0, false);
          }
        }, 50);
      }
    });
  });

  // Address Copy Buttons
  const copyButtons = document.querySelectorAll('.btn-copy-address');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copyTarget;
      const textToCopy = document.getElementById(targetId)?.textContent;
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          btn.classList.add('copied');
          const icon = btn.querySelector('i');
          if (icon) {
            icon.setAttribute('data-lucide', 'check');
            // Re-render Lucide icons inside this button
            if (window.lucide) {
              window.lucide.createIcons();
            }
          }
          setTimeout(() => {
            btn.classList.remove('copied');
            if (icon) {
              icon.setAttribute('data-lucide', 'copy');
              if (window.lucide) {
                window.lucide.createIcons();
              }
            }
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text: ', err);
        });
      }
    });
  });
}

// Initialize everything on page load
window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  setupEventListeners();
  refreshDashboard();
});
