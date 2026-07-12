import { fetchBinanceKlines } from '../src/aggregator.js';
import { 
  calculateEMA, 
  calculateSMA, 
  calculateRSI, 
  calculateStochRSI, 
  detectDivergences, 
  detectFVGs, 
  detectSupportResistance,
  runPredictionEngine
} from '../src/indicators.js';

async function testIndicators() {
  console.log('🧪 Iniciando testes de indicadores e algoritmos de predição...');
  
  try {
    // 1. Obter velas de base (BTC/USD, 1d)
    console.log('Buscando dados da Binance (BTCUSDT, 1d) para os cálculos...');
    const candles = await fetchBinanceKlines('BTC', '1d', 300);
    const closes = candles.map(c => c.close);
    console.log(`Carregadas ${candles.length} velas.`);

    // 2. Testar EMAs e SMAs
    console.log('\nCalculando Médias Móveis...');
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema52 = calculateEMA(closes, 52);
    const sma100 = calculateSMA(closes, 100);
    const sma200 = calculateSMA(closes, 200);

    console.log(`EMA 9 (última): ${ema9[ema9.length - 1]}`);
    console.log(`EMA 21 (última): ${ema21[ema21.length - 1]}`);
    console.log(`EMA 52 (última): ${ema52[ema52.length - 1]}`);
    console.log(`SMA 100 (última): ${sma100[sma100.length - 1]}`);
    console.log(`SMA 200 (última): ${sma200[sma200.length - 1]}`);

    if (isNaN(ema9[ema9.length - 1]) || isNaN(sma200[sma200.length - 1])) {
      throw new Error('Médias Móveis retornaram NaN');
    }
    console.log('✅ Médias Móveis calculadas com sucesso!');

    // 3. Testar RSI e Stoch RSI
    console.log('\nCalculando RSI e Stoch RSI...');
    const rsi = calculateRSI(closes, 14);
    const stochRsi = calculateStochRSI(closes, 14, 14, 3, 3);

    console.log(`RSI 14 (último): ${rsi[rsi.length - 1]}`);
    console.log(`StochRSI %K (último): ${stochRsi.k[stochRsi.k.length - 1]}`);
    console.log(`StochRSI %D (último): ${stochRsi.d[stochRsi.d.length - 1]}`);

    if (isNaN(rsi[rsi.length - 1]) || isNaN(stochRsi.k[stochRsi.k.length - 1])) {
      throw new Error('RSI ou Stoch RSI retornaram NaN');
    }
    console.log('✅ RSI e Stoch RSI calculados com sucesso!');

    // 4. Testar Detector de Divergências
    console.log('\nTestando Detector de Divergências no Stoch RSI...');
    const divergence = detectDivergences(closes, stochRsi.k);
    console.log('Divergência detectada:', divergence);
    console.log('✅ Detector de divergências executado com sucesso!');

    // 5. Testar Fair Value Gaps (FVG)
    console.log('\nTestando Detector de Fair Value Gaps (FVG)...');
    const fvgs = detectFVGs(candles);
    console.log(`Encontrados ${fvgs.length} FVGs ativos/não mitigados.`);
    if (fvgs.length > 0) {
      console.log('Exemplo de FVG detectado:', fvgs[0]);
    }
    console.log('✅ Detecção de FVGs concluída!');

    // 6. Testar Suportes e Resistências (S/R)
    console.log('\nTestando identificador de Suporte e Resistência...');
    const sr = detectSupportResistance(candles);
    console.log(`Suportes mapeados: ${sr.supports.slice(0, 5).join(', ')}...`);
    console.log(`Resistências mapeadas: ${sr.resistances.slice(0, 5).join(', ')}...`);
    console.log('✅ Mapeamento S/R concluído!');

    // 7. Testar Motor de Predição
    console.log('\nTestando Motor de Predição (SCM)...');
    const currentPrice = closes[closes.length - 1];
    const mockOnChain = {
      sthRp: currentPrice * 0.9, // Simular STH-RP ligeiramente abaixo do preço
      lthRp: currentPrice * 0.7, // Simular LTH-RP bem abaixo do preço
      mvrvZscore: 1.2
    };

    const prediction = runPredictionEngine(
      currentPrice,
      { closes, ema9, ema21, ema52, sma100, sma200, rsi, stochK: stochRsi.k },
      fvgs,
      sr,
      mockOnChain
    );

    console.log('Resultado da Predição SCM:', prediction);
    if (typeof prediction.score !== 'number' || !prediction.bias) {
      throw new Error('Formato da predição é inválido');
    }
    console.log('✅ Motor de predição testado com sucesso!');

    console.log('\n🎉 Todos os indicadores e lógica preditiva foram validados e testados com sucesso!');
  } catch (error) {
    console.error('❌ Falha nos testes dos indicadores:', error);
    process.exit(1);
  }
}

testIndicators();
