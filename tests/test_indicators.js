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
  console.log('🧪 Starting technical indicators and prediction algorithm tests...');
  
  try {
    // 1. Fetch base candles (BTC/USD, 1d)
    console.log('Fetching Binance data (BTCUSDT, 1d) for calculations...');
    const candles = await fetchBinanceKlines('BTC', '1d', 300);
    const closes = candles.map(c => c.close);
    console.log(`Loaded ${candles.length} candles.`);

    // 2. Test EMAs and SMAs
    console.log('\nCalculating Moving Averages...');
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema52 = calculateEMA(closes, 52);
    const sma100 = calculateSMA(closes, 100);
    const sma200 = calculateSMA(closes, 200);

    console.log(`EMA 9 (last): ${ema9[ema9.length - 1]}`);
    console.log(`EMA 21 (last): ${ema21[ema21.length - 1]}`);
    console.log(`EMA 52 (last): ${ema52[ema52.length - 1]}`);
    console.log(`SMA 100 (last): ${sma100[sma100.length - 1]}`);
    console.log(`SMA 200 (last): ${sma200[sma200.length - 1]}`);

    if (isNaN(ema9[ema9.length - 1]) || isNaN(sma200[sma200.length - 1])) {
      throw new Error('Moving Averages returned NaN');
    }
    console.log('✅ Moving Averages successfully calculated!');

    // 3. Test RSI and Stoch RSI
    console.log('\nCalculating RSI and Stoch RSI...');
    const rsi = calculateRSI(closes, 14);
    const stochRsi = calculateStochRSI(closes, 14, 14, 3, 3);

    console.log(`RSI 14 (last): ${rsi[rsi.length - 1]}`);
    console.log(`StochRSI %K (last): ${stochRsi.k[stochRsi.k.length - 1]}`);
    console.log(`StochRSI %D (last): ${stochRsi.d[stochRsi.d.length - 1]}`);

    if (isNaN(rsi[rsi.length - 1]) || isNaN(stochRsi.k[stochRsi.k.length - 1])) {
      throw new Error('RSI or Stoch RSI returned NaN');
    }
    console.log('✅ RSI and Stoch RSI successfully calculated!');

    // 4. Test Divergence Detector
    console.log('\nTesting Stoch RSI Divergence Detector...');
    const divergence = detectDivergences(closes, stochRsi.k);
    console.log('Divergence detected:', divergence);
    console.log('✅ Divergence detector successfully executed!');

    // 5. Test Fair Value Gaps (FVG)
    console.log('\nTesting Fair Value Gaps (FVG) Detector...');
    const fvgs = detectFVGs(candles);
    console.log(`Found ${fvgs.length} active/unmitigated FVGs.`);
    if (fvgs.length > 0) {
      console.log('Sample FVG detected:', fvgs[0]);
    }
    console.log('✅ FVG detection completed!');

    // 6. Test Supports and Resistances (S/R)
    console.log('\nTesting Support and Resistance identifier...');
    const sr = detectSupportResistance(candles);
    console.log(`Mapped supports: ${sr.supports.slice(0, 5).join(', ')}...`);
    console.log(`Mapped resistances: ${sr.resistances.slice(0, 5).join(', ')}...`);
    console.log('✅ S/R mapping completed!');

    // 7. Test Prediction Engine
    console.log('\nTesting Prediction Engine (SCM)...');
    const currentPrice = closes[closes.length - 1];
    const mockOnChain = {
      sthRp: currentPrice * 0.9, // Simulate STH-RP slightly below price
      lthRp: currentPrice * 0.7, // Simulate LTH-RP well below price
      mvrvZscore: 1.2
    };

    const prediction = runPredictionEngine(
      currentPrice,
      { closes, ema9, ema21, ema52, sma100, sma200, rsi, stochK: stochRsi.k },
      fvgs,
      sr,
      mockOnChain
    );

    console.log('SCM Prediction Result:', prediction);
    if (typeof prediction.score !== 'number' || !prediction.bias) {
      throw new Error('Invalid prediction format');
    }
    console.log('✅ Prediction engine successfully tested!');

    console.log('\n🎉 All indicators and predictive logic were successfully validated and tested!');
  } catch (error) {
    console.error('❌ Failed indicator tests:', error);
    process.exit(1);
  }
}

testIndicators();
