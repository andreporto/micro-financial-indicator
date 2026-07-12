# Feature 4: Fair Value Gaps (FVG) and Support/Resistance (S/R) Zones

This feature is dedicated to the automatic mapping of price imbalances (Fair Value Gaps - FVG) and the demarcation of macro support and resistance zones on the chart.

---

## 1. Fair Value Gaps (FVG)

A **Fair Value Gap (FVG)** occurs when there is a central candle of strong expansion driven by an imbalance between supply and demand, leaving a gap that the price tends to revisit to rebalance the market (mitigation).

### 1.1. Identification Logic (3 Consecutive Candles: $C_1, C_2, C_3$)

* **Bullish FVG**:
  - Condition: Candle 3 Low ($Low_3$) is strictly greater than Candle 1 High ($High_1$).
  - FVG Zone: Interval $[High_1, Low_3]$.
  - Visual Representation: Translucent green rectangle extending to the right.

* **Bearish FVG**:
  - Condition: Candle 3 High ($High_3$) is strictly less than Candle 1 Low ($Low_1$).
  - FVG Zone: Interval $[High_3, Low_1]$.
  - Visual Representation: Translucent red/pink rectangle extending to the right.

```
   Bullish FVG (Visual):
   
   Candle 3 (Bullish)   |---| (Low = Low3)
                        |   |
   =====================|===|============== [Upper Limit of FVG = Low3]
   Candle 2 (Impulse)   |   | (Huge candle with no overlapping wicks)
   =====================|===|============== [Lower Limit of FVG = High1]
                        |   |
   Candle 1 (Bullish)   |---| (High = High1)
```

### 1.2. Mitigation Algorithm (Filling the FVG)
An FVG remains "active" until future candle prices completely cross the gap zone:
* For a **Bullish FVG**: If the closing price or low of any subsequent candle is less than or equal to the lower limit ($High_1$), the FVG is marked as *mitigated* (removed from the chart).
* For a **Bearish FVG**: If the high or close of any subsequent candle is greater than or equal to the upper limit ($Low_1$), the FVG is *mitigated*.

---

## 2. Support and Resistance Zones (S/R)

Instead of thin lines that generate false breakouts, we define **zones** based on highly relevant pivots (Swing Highs/Lows) on the weekly and monthly charts.

### 2.1. Clustering Logic
1. **Identify Pivots**: Find important local tops and bottoms ($Swing\ Highs$ and $Swing\ Lows$).
2. **Proximity Clustering**: If two or more pivots are within a distance of $\pm 1.5\%$ of each other's price, we group these levels into a single **S/R Zone**.
3. **Zone Calculation**:
   - The upper edge of the zone is the maximum of the wicks of the grouped pivots.
   - The lower edge is the minimum of the closes/opens of the grouped pivots (candle bodies).
4. **Support/Resistance Strength**: Count how many times price touched and respected the zone. Zones with more touches gain greater opacity and thickness in the interface.

---

## 3. Example Code (TypeScript)

```typescript
interface FVG {
  id: string;
  type: 'BULLISH' | 'BEARISH';
  topPrice: number;
  bottomPrice: number;
  startIndex: number;
  isMitigated: boolean;
}

export function detectFVGs(candles: { high: number; low: number }[]): FVG[] {
  const fvgs: FVG[] = [];

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1]; // Middle candle (strong expansion)
    const c3 = candles[i];

    // 1. Detect Bullish FVG
    if (c3.low > c1.high) {
      fvgs.push({
        id: `bullish-fvg-${i}`,
        type: 'BULLISH',
        topPrice: c3.low,
        bottomPrice: c1.high,
        startIndex: i - 1,
        isMitigated: false,
      });
    }

    // 2. Detect Bearish FVG
    if (c3.high < c1.low) {
      fvgs.push({
        id: `bearish-fvg-${i}`,
        type: 'BEARISH',
        topPrice: c1.low,
        bottomPrice: c3.high,
        startIndex: i - 1,
        isMitigated: false,
      });
    }
  }

  // Check Mitigation throughout history
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
```

---

## 4. Rendering in TradingView
In `@tradingview/lightweight-charts`, we draw rectangles using markings or price lines (`PriceLine` / custom drawings) to cover the time range of the active FVG:
* Active Bullish FVG rectangles are displayed in translucent green (`rgba(16, 185, 129, 0.15)`).
* Active Bearish FVG rectangles are displayed in translucent red (`rgba(239, 68, 68, 0.15)`).
