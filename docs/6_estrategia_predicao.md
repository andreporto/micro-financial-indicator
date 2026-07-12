# Feature 6: Weighted Prediction Engine (Next 2 Months)

This feature describes the logic and mathematical intelligence of the **Multidimensional Confluence Score (SCM)**, responsible for formulating the high-probability prediction strategy for the next 60 days (2 months).

---

## 1. General Operation of the Prediction Engine

The prediction engine evaluates highly relevant technical data (HTF) combined with network health (on-chain data) to avoid noise and generate trading decisions based on consolidated data.

The algorithm's result is a numerical score ranging from **-100 (Extremely Bearish / Sell)** to **+100 (Extremely Bullish / Buy)**. The engine operates in daily calculation cycles and displays the predictive thesis on the dashboard.

---

## 2. The Scoring Matrix (SCM)

The score is divided into 4 strategic pillars with defined weights:

### 2.1. Pillar 1: Macro Trend (Weight: 40% / Max: 40 points)
The macro trend on the weekly (1w) and 3-day (3d) charts dictates the primary direction.
* **Price relative to the Weekly EMA 21**:
  - Price closed above EMA 21: **+20 points**
  - Price closed below EMA 21: **-20 points**
* **Moving Averages Alignment (EMA 9 > EMA 21 > EMA 52)**:
  - Bullish aligned structure: **+20 points**
  - Bearish aligned structure (EMA 9 < EMA 21 < EMA 52): **-20 points**
  - Otherwise (crossing/sideways averages): **0 points**

### 2.2. Pillar 2: Momentum and Divergences (Weight: 20% / Max: 20 points)
Captures trend exhaustion through the Stochastic RSI and classic RSI.
* **Divergences on the Stochastic RSI (3d or 1w Charts)**:
  - Active Bullish divergence detected in the last 10 candles: **+10 points**
  - Active Bearish divergence detected in the last 10 candles: **-10 points**
* **Weekly RSI**:
  - Weekly RSI exiting oversold (< 30): **+10 points**
  - Weekly RSI exiting overbought (> 70): **-10 points**

### 2.3. Pillar 3: Market Structure and Price Action (Weight: 20% / Max: 20 points)
Maps regions of interest where price has a high probability of reacting.
* **Highly relevant Fair Value Gaps (FVG)**:
  - Price currently inside an active weekly **Bullish FVG**: **+10 points**
  - Price currently inside an active weekly **Bearish FVG**: **-10 points**
* **Support and Resistance Zones**:
  - Price touching an active **Macro Support Zone** (with more than 3 touches): **+10 points**
  - Price touching an active **Macro Resistance Zone** (with more than 3 touches): **-10 points**

### 2.4. Pillar 4: On-Chain Health (Weight: 20% / Max: 20 points)
Maps the intrinsic value and behavior of coin holders.
* **Price relative to the STH-RP (Short-Term Holder Realized Price)**:
  - Price > STH-RP (Uptrend sustained by new capital inflows): **+10 points**
  - Price < STH-RP (Downtrend with new investors in unrealized loss): **-10 points**
* **MVRV Z-Score**:
  - Z-Score in historical accumulation zone (< 0.5): **+10 points**
  - Z-Score in distribution / top zone (> 2.5): **-10 points**

---

## 3. Decision-Making Logic & Tactical Execution (Next 2 Months)

Based on the final SCM value, the system generates the suggested trading action plan for the next 60 days:

### A) Strong Bullish Bias (SCM $\ge$ +60)
* **Predicted Direction**: Consistent uptrend or ascending accumulation.
* **Execution Plan**:
  - **Entry Zones**: Limit buys positioned at the **STH-RP** or the support zone of the nearest **Bullish FVG**.
  - **Target**: Next weekly/monthly macro resistance identified by VPVR.
  - **Stop-loss (Invalidation)**: Weekly close below the **LTH-RP** or the previous pivot low.

### B) Strong Bearish Bias (SCM $\le$ -60)
* **Predicted Direction**: Structural downtrend or search for liquidity at lower levels.
* **Execution Plan**:
  - **Strategy**: Drastic reduction of exposure (Spot -> Stablecoins), protection through derivatives (Hedging), or quick sells at resistances.
  - **Sell/Short Zones**: At the **Weekly EMA 21** retest or on the filling of active **Bearish FVGs**.
  - **Target**: LTH-RP or the bottom of the Rainbow Chart ("Fire Sale").

### C) Neutral / Sideways Bias (-30 to +30)
* **Predicted Direction**: Sideways movement within a channel (Range).
* **Execution Plan**:
  - **Strategy**: Buy at the lower boundaries of the channel (support) and sell at the upper boundaries (resistance), without holding long-term positions. Avoid trading in the middle of the price range.

---

## 4. Engine Execution Flow in Code

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

  // 1. Pillar 1: Macro Trend
  const currentEma21 = indicators.ema21[indicators.ema21.length - 1];
  if (price > currentEma21) score += 20;
  else score -= 20;

  const currentEma9 = indicators.ema9[indicators.ema9.length - 1];
  const currentEma52 = indicators.ema52[indicators.ema52.length - 1];
  if (currentEma9 > currentEma21 && currentEma21 > currentEma52) score += 20;
  if (currentEma9 < currentEma21 && currentEma21 < currentEma52) score -= 20;

  // 2. Pillar 2: Divergences
  // (Call to the findDivergences function described in Feature 3)
  // If 'BULLISH' -> score += 10; if 'BEARISH' -> score -= 10;

  // 3. Pillar 3: Price Action (FVG and Support)
  // Verify if the current price is within any active FVG
  const inBullishFvg = fvgs.some(f => f.type === 'BULLISH' && price <= f.topPrice && price >= f.bottomPrice);
  if (inBullishFvg) score += 10;

  // 4. Pillar 4: On-chain Data
  if (price > onchain.sthRp) score += 10;
  else score -= 10;

  if (onchain.mvrv < 0.5) score += 10;
  if (onchain.mvrv > 2.5) score -= 10;

  // Determine the action plan
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
