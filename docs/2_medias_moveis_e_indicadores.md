# Feature 2: Moving Averages (MA/EMA) and Technical Indicators (RSI/Stoch RSI)

This feature describes the calculation and plotting logic for 9, 21, 52, 100, and 200 period moving averages, as well as RSI and Stochastic RSI oscillators on the charts.

---

## 1. Detailed Description
Indicators help filter out short-term noise and reveal trend direction and price exhaustion zones.
* **Fast Averages (EMA 9, EMA 21)**: Follow the immediate price trend.
* **Intermediate Average (EMA 52)**: Acts as a key medium-term support/resistance.
* **Slow Averages (SMA 100, SMA 200)**: Define the macro bias (Bull/Bear Market).
* **RSI (14)**: Measures the speed and change of price movements.
* **Stoch RSI (14, 14, 3, 3)**: Combines RSI with the stochastic oscillator to find faster tops and bottoms in the HTF.

---

## 2. Mathematical Formulas and Calculation Methods

### 2.1. Simple Moving Average (SMA)
Calculates the arithmetic mean of closing prices over a period $N$.
$$\text{SMA}_t = \frac{\sum_{i=0}^{N-1} \text{Close}_{t-i}}{N}$$

### 2.2. Exponential Moving Average (EMA)
Gives more weight to recent prices. The multiplier is $k = 2 / (N + 1)$.
$$\text{EMA}_t = (\text{Close}_t \times k) + (\text{EMA}_{t-1} \times (1 - k))$$
*For the first candle, the initial value of the EMA is simply its corresponding SMA.*

### 2.3. Relative Strength Index (RSI)
$$\text{RSI} = 100 - \frac{100}{1 + \text{RS}}$$
Where $\text{RS} = \frac{\text{Average Gain}}{\text{Average Loss}}$ over the 14-day period (Wilder's smoothing).

### 2.4. Stochastic RSI (Stoch RSI)
Measures the RSI level relative to its high/low range over a period (usually 14).
$$\text{StochRSI} = \frac{\text{RSI} - \min(\text{RSI}, 14)}{\max(\text{RSI}, 14) - \min(\text{RSI}, 14)}$$
* The %K line is the simple moving average (usually 3 periods) of the raw StochRSI.
* The %D line is the simple moving average (usually 3 periods) of the %K line.

---

## 3. Step-by-Step Implementation

### Step 1: Calculation Algorithms in TypeScript
To avoid compilation issues with native packages (C++), we implement pure calculation functions:

```typescript
// Example of SMA calculation
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Insufficient data
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Example of EMA calculation
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let previousEma = 0;

  // Initialize the first valid candle with the corresponding SMA
  const initialSma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      previousEma = initialSma;
      ema.push(previousEma);
    } else {
      const currentEma = (data[i] - previousEma) * k + previousEma;
      ema.push(currentEma);
      previousEma = currentEma;
    }
  }
  return ema;
}
```

### Step 2: Linking Averages Series in TradingView
On the frontend, we create additional lines overlaid on the main candlestick chart:

```typescript
const colors = {
  ema9: '#3b82f6',   // Blue
  ema21: '#f59e0b',  // Orange
  ema52: '#10b981',  // Green
  sma100: '#8b5cf6', // Purple
  sma200: '#ef4444'  // Red
};

const addLineSeries = (chart, color, width = 1.5) => {
  return chart.addSeries(LightweightCharts.LineSeries, {
    color,
    lineWidth: width,
    crosshairMarkerVisible: false,
    lastValueVisible: false,
  });
};

const line9 = addLineSeries(chart, colors.ema9);
const line21 = addLineSeries(chart, colors.ema21);
const line52 = addLineSeries(chart, colors.ema52);
const line100 = addLineSeries(chart, colors.sma100, 2);
const line200 = addLineSeries(chart, colors.sma200, 2.5);
```

### Step 3: Creating the Subchart of Oscillators
RSI and Stochastic RSI have fixed scales from 0 to 100. They must be displayed in dedicated panels below the main chart:

1. **RSI Panel**:
   * Dotted horizontal line at **30** (oversold) and **70** (overbought).
   * RSI signal line (usually purple).
2. **Stochastic RSI Panel**:
   * Dotted horizontal line at **20** and **80**.
   * Two lines: **%K** (usually blue, fast) and **%D** (usually orange, slow).
   * Translucent fill between threshold lines (20-80).
