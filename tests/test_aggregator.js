import { getCandleData } from '../src/aggregator.js';

async function testAggregator() {
  console.log('🧪 Starting candle aggregation tests...');
  
  try {
    // Test 1: Fetch native 1w data for BTC
    console.log('Testing native fetch (BTC / 1w)...');
    const btc1w = await getCandleData('BTC', '1w');
    console.log(`✅ Success! Received ${btc1w.length} candles.`);
    if (btc1w.length === 0) throw new Error('Empty candle array for 1w');
    
    // Verify candle format
    const candle = btc1w[0];
    console.log('Sample candle format:', candle);
    if (typeof candle.time !== 'number') throw new Error('Time is not a number');
    if (typeof candle.open !== 'number') throw new Error('Open is not a number');
    if (typeof candle.close !== 'number') throw new Error('Close is not a number');
    if (typeof candle.high !== 'number') throw new Error('High is not a number');
    if (typeof candle.low !== 'number') throw new Error('Low is not a number');
    if (typeof candle.volume !== 'number') throw new Error('Volume is not a number');
    
    // Test 2: Fetch aggregated 3d data for ETH
    console.log('\nTesting custom aggregation (ETH / 3d)...');
    const eth3d = await getCandleData('ETH', '3d');
    console.log(`✅ Success! Received ${eth3d.length} aggregated candles.`);
    
    // Test 3: Fetch aggregated 2w data for SOL
    console.log('\nTesting custom aggregation (SOL / 2w)...');
    const sol2w = await getCandleData('SOL', '2w');
    console.log(`✅ Success! Received ${sol2w.length} aggregated candles.`);
    
    console.log('\n🎉 All aggregation tests passed successfully!');
  } catch (error) {
    console.error('❌ Failed aggregation tests:', error);
    process.exit(1);
  }
}

testAggregator();
