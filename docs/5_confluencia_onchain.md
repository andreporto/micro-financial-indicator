# Feature 5: Integration and Confluence of On-Chain Data

This feature describes the modeling, API consumption, and confluence logic for the four primary on-chain metrics: **Rainbow Chart, MVRV Z-Score, Short-Term Holder Realized Price (STH-RP), and Long-Term Holder Realized Price (LTH-RP)**.

---

## 1. Detailed Description of the Metrics

While technical analysis (charts and oscillators) studies price behavior, on-chain data investigates investor behavior on the blockchain. Combining both drastically reduces false signals.

### 1.1. Rainbow Chart
Based on a logarithmic regression mapping Bitcoin growth over time. The chart is divided into 9 colored bands.
* **Mathematical Model (BTC)**:
  $$\ln(\text{Price}) = A \cdot \ln(\text{Days since Epoch}) + B$$
  *(Days calculated starting from 01/09/2009).*
* **Bands**:
  1. *Dark Blue / Blue*: "Fire Sale" / "Buy"
  2. *Light Green / Green*: "Accumulate" / "Still Cheap"
  3. *Yellow*: "HODL!"
  4. *Orange / Dark Orange*: "Is this a Bubble?" / "FOMO Intensifies"
  5. *Red / Dark Red*: "Sell, Seriously!" / "Maximum Bubble Territory"

### 1.2. MVRV Z-Score
Measures the standard deviation difference between Market Cap and Realized Cap (the actual value paid for the coins).
* **Formula**:
  $$\text{Z-Score} = \frac{\text{Market Cap} - \text{Realized Cap}}{\sigma(\text{Market Cap})}$$
* **Alert Levels**:
  - **Z-Score < 0.1**: Extreme undervaluation zone (historical Macro Bottom).
  - **Z-Score > 3.0**: Overvaluation zone (Distribution / Macro Top).

### 1.3. Realized Prices
* **Short-Term Holder Realized Price (STH-RP)**: Average cost of coins held for less than 155 days (speculators / recent retail investors).
* **Long-Term Holder Realized Price (LTH-RP)**: Average cost of coins held for more than 155 days (experienced HODLers / whales).
* **Structural Use**:
  - **Bull Market**: Price remains above both lines. The STH-RP retest typically marks the bottom of local corrections.
  - **Bear Market**: Price drops below STH-RP, turning it into resistance. The final capitulation bottom usually occurs at the LTH-RP retest or below.

---

## 2. Step-by-Step Implementation

### Step 1: Data Acquisition (Backend Pipeline)
On-chain data is not updated every second; a daily update (once a day) is sufficient.

* **Example API Integration (Glassnode)**:
  - STH-RP Endpoint: `/v1/metrics/realized/price_non_coinstats_sth`
  - LTH-RP Endpoint: `/v1/metrics/realized/price_non_coinstats_lth`
  - MVRV Z-Score Endpoint: `/v1/metrics/market/mvrv_z_score`

***Example Synchronization Service Code:**
```typescript
import axios from 'axios';

interface OnChainData {
  timestamp: number;
  sthRp: number;
  lthRp: number;
  mvrvZscore: number;
}

export async function fetchOnChainMetrics(symbol: string): Promise<OnChainData[]> {
  const apiKey = process.env.GLASSNODE_API_KEY;
  // Integration with Glassnode API or similar
  const response = await axios.get(`https://api.glassnode.com/v1/metrics/market/mvrv_z_score`, {
    params: { a: symbol, api_key: apiKey }
  });
  
  return response.data.map((item: any) => ({
    timestamp: item.t,
    mvrvZscore: item.v
  }));
}
```

### Step 2: Normalization and Mapping
Normalize on-chain timestamps to align with TradingView chart candle timestamps. If the user is on the **1 week (1w)** chart, we extract the on-chain metric corresponding to the last day of that week.

### Step 3: Creating the On-Chain Confluence Widget
On the frontend, we create an informative panel next to the chart:

1. **Rainbow Chart Card**:
   - Calculates the band in which BTC is today.
   - Shows a colored visual indicator with the text of the current band (e.g. `Accumulate` in Green).
2. **MVRV Z-Score Card**:
   - A gauge chart or horizontal progress bar showing the current Z-Score position relative to risk zones.
3. **Realized Averages vs Price Crossover**:
   - Shows the percentage distance from the current price to the STH-RP and LTH-RP.
   - Example: `Price is 8% above STH-RP (Active Support)` or `Price lost STH-RP by -3% (Bearish Alert)`.
