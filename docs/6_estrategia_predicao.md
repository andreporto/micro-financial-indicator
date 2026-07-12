# Funcionalidade 6: Motor de Predição Ponderada (Próximos 2 Meses)

Esta funcionalidade descreve a lógica e a inteligência matemática do **Score de Confluência Multidimensional (SCM)**, responsável por formular a estratégia de predição de alta probabilidade para os próximos 60 dias (2 meses).

---

## 1. Funcionamento Geral do Motor de Predição

O motor de predição avalia dados técnicos de alta relevância (HTF) combinados com a saúde da rede (dados on-chain) para evitar ruídos e gerar decisões de trading baseadas em dados consolidados.

O resultado do algoritmo é um score numérico de **-100 (Extremamente Bearish / Venda)** a **+100 (Extremamente Bullish / Compra)**. O motor opera em ciclos diários de cálculo e expõe a tese preditiva no painel.

---

## 2. A Matriz de Pontuação (SCM)

O score é dividido em 4 pilares estratégicos com pesos definidos:

### 2.1. Pilar 1: Tendência Macro (Peso: 40% / Máx: 40 pontos)
A tendência macro no gráfico semanal (1w) e de 3 dias (3d) dita a direção principal.
* **Preço em relação à EMA 21 Semanal**:
  - Preço Fechou acima da EMA 21: **+20 pontos**
  - Preço Fechou abaixo da EMA 21: **-20 pontos**
* **Alinhamento de Médias Móveis (EMA 9 > EMA 21 > EMA 52)**:
  - Estrutura de alta alinhada: **+20 pontos**
  - Estrutura de baixa alinhada (EMA 9 < EMA 21 < EMA 52): **-20 pontos**
  - Caso contrário (Médias cruzando/laterais): **0 pontos**

### 2.2. Pilar 2: Momento e Divergências (Peso: 20% / Máx: 20 pontos)
Captura a exaustão da tendência através do Stochastic RSI e RSI clássico.
* **Divergências no Stochastic RSI (Gráficos de 3d ou 1w)**:
  - Divergência Bullish ativa detectada nos últimos 10 candles: **+10 pontos**
  - Divergência Bearish ativa detectada nos últimos 10 candles: **-10 pontos**
* **RSI Semanal**:
  - RSI semanal saindo da sobrevenda (< 30): **+10 pontos**
  - RSI semanal saindo da sobrecompra (> 70): **-10 pontos**

### 2.3. Pilar 3: Estrutura de Mercado e Price Action (Peso: 20% / Máx: 20 pontos)
Mapeia regiões de interesse onde o preço possui alta probabilidade de reagir.
* **Fair Value Gaps (FVG) de alta relevância**:
  - Preço atualmente dentro de um **Bullish FVG** semanal ativo: **+10 pontos**
  - Preço atualmente dentro de um **Bearish FVG** semanal ativo: **-10 pontos**
* **Zonas de Suporte e Resistência**:
  - Preço tocando uma **Zona de Suporte Macro** ativa (com mais de 3 toques): **+10 pontos**
  - Preço tocando uma **Zona de Resistência Macro** ativa (com mais de 3 toques): **-10 pontos**

### 2.4. Pilar 4: Saúde On-Chain (Peso: 20% / Máx: 20 pontos)
Mapeia o valor intrínseco e o comportamento dos detentores de moedas.
* **Preço em relação ao STH-RP (Short-Term Holder Realized Price)**:
  - Preço > STH-RP (Tendência de alta sustentada por novos capitais): **+10 pontos**
  - Preço < STH-RP (Tendência de baixa com novos investidores no prejuízo): **-10 pontos**
* **MVRV Z-Score**:
  - Z-Score na zona de acumulação histórica (< 0.5): **+10 pontos**
  - Z-Score na zona de distribuição / topo (> 2.5): **-10 pontos**

---

## 3. Lógica de Tomada de Decisão & Execução Tática (Próximos 2 Meses)

Com base no valor final do SCM, o sistema gera o plano de ação de trading sugerido para os próximos 60 dias:

### A) Forte Viés Bullish (SCM $\ge$ +60)
* **Direção Prevista**: Alta consistente ou acumulação ascendente.
* **Plano de Execução**:
  - **Zonas de Entrada**: Compras limitadas posicionadas no **STH-RP** ou na zona de suporte do **Bullish FVG** mais próximo.
  - **Alvo**: Próxima resistência macro semanal / mensal identificada pelo VPVR.
  - **Stop-loss (Invalidação)**: Fechamento semanal abaixo do **LTH-RP** ou da mínima do pivô anterior.

### B) Forte Viés Bearish (SCM $\le$ -60)
* **Direção Prevista**: Queda estrutural ou busca por liquidez em níveis inferiores.
* **Plano de Execução**:
  - **Estratégia**: Redução drástica de exposição (Spot -> Stablecoins), proteção por meio de derivativos (Hedging) ou vendas rápidas em resistências.
  - **Zonas de Venda/Short**: No reteste da **EMA 21 Semanal** ou no preenchimento de **Bearish FVGs** ativos.
  - **Alvo**: LTH-RP ou base do Rainbow Chart ("Liquidação Total").

### C) Viés Neutro / Lateral (-30 a +30)
* **Direção Prevista**: Lateralização dentro de um canal (Range).
* **Plano de Execução**:
  - **Estratégia**: Comprar nas bordas inferiores do canal (suporte) e vender nas bordas superiores (resistência), sem carregar posições de longo prazo. Evitar operações no meio da faixa de preço.

---

## 4. Fluxo de Execução do Motor no Código

```typescript
export function runPredictionEngine(
  price: number,
  candles1w: any[],
  indicators: { ema9: number[]; ema21: number[]; ema52: number[]; rsi: number[]; stochRsiK: number[] },
  fvgs: any[],
  supports: any[],
  onchain: { sthRp: number; mvrv: number }
) {
  let score = 0;

  // 1. Pilar 1: Tendência Macro
  const currentEma21 = indicators.ema21[indicators.ema21.length - 1];
  if (price > currentEma21) score += 20;
  else score -= 20;

  const currentEma9 = indicators.ema9[indicators.ema9.length - 1];
  const currentEma52 = indicators.ema52[indicators.ema52.length - 1];
  if (currentEma9 > currentEma21 && currentEma21 > currentEma52) score += 20;
  if (currentEma9 < currentEma21 && currentEma21 < currentEma52) score -= 20;

  // 2. Pilar 2: Divergências
  // (Chamada para a função findDivergences descrita na Funcionalidade 3)
  // Se 'BULLISH' -> score += 10; se 'BEARISH' -> score -= 10;

  // 3. Pilar 3: Price Action (FVG e Suporte)
  // Verificar se o preço atual está dentro de algum FVG ativo
  const inBullishFvg = fvgs.some(f => f.type === 'BULLISH' && price <= f.topPrice && price >= f.bottomPrice);
  if (inBullishFvg) score += 10;

  // 4. Pilar 4: Dados On-chain
  if (price > onchain.sthRp) score += 10;
  else score -= 10;

  if (onchain.mvrv < 0.5) score += 10;
  if (onchain.mvrv > 2.5) score -= 10;

  // Determinar o plano de ação
  let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (score >= 60) bias = 'BULLISH';
  else if (score <= -60) bias = 'BEARISH';

  return {
    score,
    bias,
    lastUpdate: new Date().toISOString(),
  };
}
```
