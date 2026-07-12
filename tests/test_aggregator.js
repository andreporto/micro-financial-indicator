import { getCandleData } from '../src/aggregator.js';

async function testAggregator() {
  console.log('🧪 Iniciando testes de agregação de velas...');
  
  try {
    // Teste 1: Buscar dados de 1w nativos para BTC
    console.log('Testando busca nativa (BTC / 1w)...');
    const btc1w = await getCandleData('BTC', '1w');
    console.log(`✅ Sucesso! Recebidas ${btc1w.length} velas.`);
    if (btc1w.length === 0) throw new Error('Array de velas vazio para 1w');
    
    // Verificar formato da vela
    const candle = btc1w[0];
    console.log('Formato da vela de amostra:', candle);
    if (typeof candle.time !== 'number') throw new Error('Time não é um número');
    if (typeof candle.open !== 'number') throw new Error('Open não é um número');
    if (typeof candle.close !== 'number') throw new Error('Close não é um número');
    if (typeof candle.high !== 'number') throw new Error('High não é um número');
    if (typeof candle.low !== 'number') throw new Error('Low não é um número');
    if (typeof candle.volume !== 'number') throw new Error('Volume não é um número');
    
    // Teste 2: Buscar dados agregados de 3d para ETH
    console.log('\nTestando agregação customizada (ETH / 3d)...');
    const eth3d = await getCandleData('ETH', '3d');
    console.log(`✅ Sucesso! Recebidas ${eth3d.length} velas agregadas.`);
    
    // Teste 3: Buscar dados agregados de 2w para SOL
    console.log('\nTestando agregação customizada (SOL / 2w)...');
    const sol2w = await getCandleData('SOL', '2w');
    console.log(`✅ Sucesso! Recebidas ${sol2w.length} velas agregadas.`);
    
    console.log('\n🎉 Todos os testes de agregação passaram com sucesso!');
  } catch (error) {
    console.error('❌ Falha nos testes de agregação:', error);
    process.exit(1);
  }
}

testAggregator();
