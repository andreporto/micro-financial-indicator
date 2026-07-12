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

// Estado global do App
let currentAsset = 'BTC';
let currentTimeframe = '1w';

// Referências de Gráficos e Séries
let priceChart = null;
let stochChart = null;
let candlestickSeries = null;
let ema9Series = null;
let ema21Series = null;
let ema52Series = null;
let sma100Series = null;
let sma200Series = null;
let stochKSeries = null;
let stochDSeries = null;
let activePriceLines = [];

// Cores dos Indicadores
const COLORS = {
  ema9: '#3b82f6',   // Azul
  ema21: '#f59e0b',  // Laranja
  ema52: '#10b981',  // Verde
  sma100: '#8b5cf6', // Roxo
  sma200: '#ef4444'  // Vermelho
};

// Dados On-Chain Simulados de Alta Fidelidade (com base no preço atual)
function getSimulatedOnChainData(asset, price) {
  if (asset === 'BTC') {
    return {
      sthRp: price * 0.88,
      lthRp: price * 0.58,
      mvrvZscore: 1.45,
      rainbowBand: 'Acumular'
    };
  } else if (asset === 'ETH') {
    return {
      sthRp: price * 0.84,
      lthRp: price * 0.52,
      mvrvZscore: 1.15,
      rainbowBand: 'Ainda Barato'
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
 * Inicializa os gráficos da TradingView.
 */
function initCharts() {
  const priceContainer = document.getElementById('price-chart-container');
  const stochContainer = document.getElementById('stoch-chart-container');

  if (!priceContainer || !stochContainer) return;

  // Limpar containers caso já existam gráficos
  priceContainer.innerHTML = '';
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
    },
    rightPriceScale: {
      borderColor: '#202e48',
    }
  };

  // 1. Criar Gráfico Principal de Preço
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
  });

  // Linhas das médias móveis
  ema9Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.ema9, lineWidth: 1.5, crosshairMarkerVisible: false, lastValueVisible: false });
  ema21Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.ema21, lineWidth: 1.5, crosshairMarkerVisible: false, lastValueVisible: false });
  ema52Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.ema52, lineWidth: 1.5, crosshairMarkerVisible: false, lastValueVisible: false });
  sma100Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.sma100, lineWidth: 2, crosshairMarkerVisible: false, lastValueVisible: false });
  sma200Series = priceChart.addSeries(LightweightCharts.LineSeries, { color: COLORS.sma200, lineWidth: 2.5, crosshairMarkerVisible: false, lastValueVisible: false });

  // 2. Criar Gráfico Secundário (Stochastic RSI)
  stochChart = LightweightCharts.createChart(stochContainer, {
    ...chartOptions,
    width: stochContainer.clientWidth,
    height: stochContainer.clientHeight,
  });

  stochKSeries = stochChart.addSeries(LightweightCharts.LineSeries, { color: '#3b82f6', lineWidth: 1.5, title: '%K' });
  stochDSeries = stochChart.addSeries(LightweightCharts.LineSeries, { color: '#f59e0b', lineWidth: 1.5, title: '%D' });

  // Adicionar limites do Stochastic RSI (20 e 80)
  stochKSeries.createPriceLine({ price: 20, color: 'rgba(148, 163, 184, 0.3)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true });
  stochKSeries.createPriceLine({ price: 80, color: 'rgba(148, 163, 184, 0.3)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, axisLabelVisible: true });

  // Sincronizar escalas de tempo dos dois gráficos
  let isReflecting = false;
  priceChart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
    if (isReflecting) return;
    isReflecting = true;
    stochChart.timeScale().setVisibleRange(timeRange);
    isReflecting = false;
  });

  stochChart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
    if (isReflecting) return;
    isReflecting = true;
    priceChart.timeScale().setVisibleRange(timeRange);
    isReflecting = false;
  });

  // Ajustar responsividade
  const resizeObserver = new ResizeObserver(() => {
    if (priceChart && stochChart) {
      priceChart.resize(priceContainer.clientWidth, priceContainer.clientHeight);
      stochChart.resize(stochContainer.clientWidth, stochContainer.clientHeight);
    }
  });
  resizeObserver.observe(priceContainer);
}

/**
 * Recarrega e renderiza dados nos gráficos e painéis com base nas seleções.
 */
async function refreshDashboard() {
  try {
    document.getElementById('current-asset-title').innerText = `${currentAsset === 'BTC' ? 'Bitcoin' : currentAsset === 'ETH' ? 'Ethereum' : 'Solana'} (${currentAsset}/USD)`;
    document.getElementById('current-timeframe-badge').innerText = currentTimeframe;

    // 1. Obter velas de mercado
    const candles = await getCandleData(currentAsset, currentTimeframe);
    if (!candles || candles.length === 0) return;

    const closes = candles.map(c => c.close);
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    // Atualizar cabeçalho de Preço
    const currentPrice = lastCandle.close;
    const priceChange = ((currentPrice - prevCandle.close) / prevCandle.close) * 100;
    
    document.getElementById('current-price-val').innerText = `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const changeBadge = document.getElementById('price-change-val');
    changeBadge.innerText = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
    changeBadge.className = `price-change-percent ${priceChange >= 0 ? 'bullish' : 'bearish'}`;

    // 2. Calcular Indicadores Técnicos
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema52 = calculateEMA(closes, 52);
    const sma100 = calculateSMA(closes, 100);
    const sma200 = calculateSMA(closes, 200);

    const stochRsi = calculateStochRSI(closes, 14, 14, 3, 3);
    const fvgs = detectFVGs(candles);
    const srLevels = detectSupportResistance(candles);

    // 3. Alimentar as Séries do TradingView
    candlestickSeries.setData(candles);
    
    // Plotar médias se marcadas no checkbox
    updateIndicatorVisibility(ema9, ema21, ema52, sma100, sma200);

    // Mapear dados do Stochastic RSI
    const stochKData = [];
    const stochDData = [];
    for (let i = 0; i < candles.length; i++) {
      if (!isNaN(stochRsi.k[i])) {
        stochKData.push({ time: candles[i].time, value: stochRsi.k[i] });
      }
      if (!isNaN(stochRsi.d[i])) {
        stochDData.push({ time: candles[i].time, value: stochRsi.d[i] });
      }
    }
    stochKSeries.setData(stochKData);
    stochDSeries.setData(stochDData);

    // 4. Limpar e Plotar Linhas de Suporte/Resistência (S/R)
    activePriceLines.forEach(line => candlestickSeries.removePriceLine(line));
    activePriceLines = [];

    // Adicionar Suportes (verde) e Resistências (vermelho) mais próximos
    srLevels.supports.slice(-3).forEach(level => {
      const line = candlestickSeries.createPriceLine({
        price: level,
        color: '#10b981',
        lineWidth: 1.5,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'SUPORTE',
      });
      activePriceLines.push(line);
    });

    srLevels.resistances.slice(0, 3).forEach(level => {
      const line = candlestickSeries.createPriceLine({
        price: level,
        color: '#ef4444',
        lineWidth: 1.5,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'RESISTÊNCIA',
      });
      activePriceLines.push(line);
    });

    // 5. Coleta e atualização de dados On-Chain
    const onchain = getSimulatedOnChainData(currentAsset, currentPrice);
    
    // Atualizar Sidebar On-Chain
    document.getElementById('sidebar-mvrv-val').innerText = `${onchain.mvrvZscore.toFixed(2)} (${onchain.mvrvZscore < 0.5 ? 'Subvalorizado' : onchain.mvrvZscore > 2.0 ? 'Sobrevalorizado' : 'Neutro'})`;
    document.getElementById('sidebar-mvrv-val').className = `val ${onchain.mvrvZscore < 0.5 ? 'text-green' : onchain.mvrvZscore > 2.0 ? 'text-red' : 'text-blue'}`;
    
    document.getElementById('sidebar-rainbow-val').innerText = onchain.rainbowBand;
    document.getElementById('sidebar-rainbow-val').className = `val ${onchain.rainbowBand.includes('Acumular') || onchain.rainbowBand.includes('Barato') ? 'text-green' : 'text-blue'}`;
    
    const pctToSth = ((currentPrice - onchain.sthRp) / onchain.sthRp) * 100;
    document.getElementById('sidebar-sth-val').innerText = `${pctToSth >= 0 ? '+' : ''}${pctToSth.toFixed(1)}%`;
    document.getElementById('sidebar-sth-val').className = `val ${pctToSth >= 0 ? 'text-green' : 'text-red'}`;

    // 6. Rodar o Motor de Predição (SCM)
    const prediction = runPredictionEngine(
      currentPrice,
      { closes, ema9, ema21, ema52, sma100, sma200, rsi: stochRsi.rsi, stochK: stochRsi.k },
      fvgs,
      srLevels,
      onchain
    );

    // Atualizar UI de Predição
    updatePredictionUI(prediction, currentPrice, onchain, fvgs, srLevels);

  } catch (error) {
    console.error("Erro ao atualizar o painel analítico:", error);
  }
}

/**
 * Atualiza o estado visual das linhas de médias móveis conforme as caixas de seleção.
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

  // Buscar estado dos checkboxes
  const showEma9 = document.getElementById('toggle-ema9').checked;
  const showEma21 = document.getElementById('toggle-ema21').checked;
  const showEma52 = document.getElementById('toggle-ema52').checked;
  const showSma100 = document.getElementById('toggle-sma100').checked;
  const showSma200 = document.getElementById('toggle-sma200').checked;

  // Coleta dados
  getCandleData(currentAsset, currentTimeframe).then(candles => {
    ema9Series.setData(showEma9 ? mapData(ema9, candles) : []);
    ema21Series.setData(showEma21 ? mapData(ema21, candles) : []);
    ema52Series.setData(showEma52 ? mapData(ema52, candles) : []);
    sma100Series.setData(showSma100 ? mapData(sma100, candles) : []);
    sma200Series.setData(showSma200 ? mapData(sma200, candles) : []);
  });
}

/**
 * Atualiza o painel inferior de Predição de 2 Meses.
 */
function updatePredictionUI(prediction, currentPrice, onchain, fvgs, srLevels) {
  // 1. Atualizar Score e Radial Progress Circle
  const scoreNum = prediction.score;
  const absScore = Math.abs(scoreNum);
  document.getElementById('pred-score-number').innerText = `${scoreNum >= 0 ? '+' : ''}${scoreNum}`;
  
  // Atualizar barra de progresso radial
  const strokeOffset = 251.2 - (251.2 * absScore) / 100;
  const progressBar = document.getElementById('score-progress');
  progressBar.style.strokeDashoffset = strokeOffset;
  
  // Mudar cor do círculo com base na pontuação
  if (scoreNum >= 40) {
    progressBar.style.stroke = '#10b981'; // Verde
  } else if (scoreNum <= -40) {
    progressBar.style.stroke = '#ef4444'; // Vermelho
  } else {
    progressBar.style.stroke = '#3b82f6'; // Azul
  }

  // 2. Atualizar o Badge de Viés
  const biasBadge = document.getElementById('pred-bias-badge');
  biasBadge.innerText = prediction.bias;
  biasBadge.className = `prediction-bias-badge ${prediction.bias.toLowerCase()}`;

  // 3. Elaborar Tese e Zonas de Compra/Alvo
  let thesis = '';
  let buyZone = '';
  let targetZone = '';
  let stopZone = '';

  if (prediction.bias === 'BULLISH') {
    thesis = `O motor SCM detecta forte confluência altista no ativo ${currentAsset}. A tendência macro de HTF está alinhada para cima, com o preço acima da EMA 21 Semanal e mantendo sustentação acima do STH-RP ($${Math.round(onchain.sthRp).toLocaleString()}). Recomenda-se aproveitar correções locais para acumulação em limites chave de suporte técnico.`;
    buyZone = `$${Math.round(onchain.sthRp).toLocaleString()} (STH-RP) até $${Math.round(currentPrice * 0.95).toLocaleString()}`;
    
    // Alvo: Primeira resistência acima do preço
    const targets = srLevels.resistances.filter(r => r > currentPrice);
    targetZone = targets.length > 0 ? `$${Math.round(targets[0]).toLocaleString()}` : `$${Math.round(currentPrice * 1.25).toLocaleString()}`;
    
    // Stop: LTH-RP ou abaixo
    stopZone = `$${Math.round(onchain.lthRp).toLocaleString()} (Invalidação macro LTH-RP)`;
  } else if (prediction.bias === 'BEARISH') {
    thesis = `O motor SCM aponta viés negativo expressivo para os próximos 2 meses no ativo ${currentAsset}. O preço rompeu suportes cruciais e está sendo negociado abaixo do STH-RP ($${Math.round(onchain.sthRp).toLocaleString()}), sinalizando exaustão institucional. Zonas de rebalanceamento Bearish (FVG) podem atuar como fortes resistências no curto prazo.`;
    buyZone = `Ficar em caixa / Aguardar capitulação`;
    
    // Alvo de queda: Próximo suporte ou LTH-RP
    const supports = srLevels.supports.filter(s => s < currentPrice);
    targetZone = supports.length > 0 ? `$${Math.round(supports[supports.length - 1]).toLocaleString()} (Próximo suporte)` : `$${Math.round(onchain.lthRp).toLocaleString()}`;
    
    // Stop: Invalidação acima da EMA 21 Semanal
    const weeklyEma21 = currentPrice * 1.08; // Valor estimado para UI
    stopZone = `$${Math.round(weeklyEma21).toLocaleString()} (Fechamento semanal acima da EMA 21)`;
  } else {
    thesis = `O mercado de ${currentAsset} encontra-se em consolidação/lateralidade no tempo gráfico de ${currentTimeframe}. O score do motor SCM está equilibrado. As médias móveis indicam acomodação e não há gatilhos de divergência fortes ativos no momento. Recomenda-se operação em canais e paciência estratégica.`;
    buyZone = `Operar apenas nas extremidades de canais S/R`;
    targetZone = `Resistências locais ($${Math.round(currentPrice * 1.05).toLocaleString()})`;
    stopZone = `Rompimento do canal de consolidação`;
  }

  document.getElementById('pred-thesis-text').innerText = thesis;
  document.getElementById('pred-buy-zone').innerText = buyZone;
  document.getElementById('pred-target-zone').innerText = targetZone;
  document.getElementById('pred-stop-zone').innerText = stopZone;

  // Atualizar valores do topo do Hero (para o ativo BTC)
  if (currentAsset === 'BTC') {
    document.getElementById('hero-score-val').innerText = `${scoreNum >= 0 ? '+' : ''}${scoreNum} / 100`;
    document.getElementById('hero-score-val').className = `stat-val ${prediction.bias === 'BULLISH' ? 'bullish' : prediction.bias === 'BEARISH' ? 'bearish' : 'text-blue'}`;
    
    const heroBias = document.getElementById('hero-bias-val');
    heroBias.innerText = prediction.bias;
    heroBias.className = `status-${prediction.bias.toLowerCase()}`;
  }

  // 4. Preencher tabela de fatores de confluência
  const tbody = document.querySelector('#scoring-table tbody');
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

/**
 * Configuração de Listeners da Interface.
 */
function setupEventListeners() {
  // Listeners dos Ativos (Sidebar)
  const assetButtons = document.querySelectorAll('#asset-selector .selector-btn');
  assetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      assetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAsset = btn.dataset.asset;
      refreshDashboard();
    });
  });

  // Listeners dos Timeframes (Sidebar)
  const timeframeButtons = document.querySelectorAll('#timeframe-selector .selector-btn');
  timeframeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      timeframeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTimeframe = btn.dataset.timeframe;
      refreshDashboard();
    });
  });

  // Checkboxes de visibilidade de médias
  const checkboxes = ['toggle-ema9', 'toggle-ema21', 'toggle-ema52', 'toggle-sma100', 'toggle-sma200'];
  checkboxes.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      // Recalcular médias a partir das velas atuais
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

  // Tabs da Documentação Geral
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
}

// Inicializar tudo ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  setupEventListeners();
  refreshDashboard();
});
