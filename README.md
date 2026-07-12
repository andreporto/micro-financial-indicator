# 📊 SaaS Financial Indicator - Dashboard & Interactive Documentation

This repository contains the complete implementation of a modern, contemporary financial SaaS platform focused on technical and macro fundamental analysis of crypto assets (**BTC, ETH, SOL**) on high time frames (HTF) integrated with high-fidelity on-chain data.

The application uses a clean and professional information design structured into **Modular Tabs** with fluid navigation. It utilizes a harmonious color palette featuring dark blue, white, gray, and functional signaling colors (bullish green, bearish red, orange warning).

---

## 🚀 Key Features

*   **Technical Dashboard with 3 Synchronized Charts**: 
    *   Price Chart (Candles, EMA 9/21/52, SMA 100/200, FVG, and Support/Resistance).
    *   Classic RSI Chart with thresholds at 30 and 70.
    *   Stochastic RSI Chart (%K and %D) with thresholds at 20 and 80.
    *   *Bidirectional Synchronization*: Manual zoom and scroll on any of the three charts instantly propagates to the others (logical bar scale aligned via Whitespace).
*   **Intelligent Support & Resistance Algorithm**: Consolidated pivots by historical touch volume and dynamically reclassified via the **Role Reversal** rule in relation to the spot price.
*   **Prediction Engine (SCM)**: The *Multidimensional Confluence Score* weights trend, momentum, price action, and on-chain indicators to calculate market bias and tactical zones for the next 60 days.
*   **Consolidated On-Chain Data**: Expanded visual section displaying the current band of the **Rainbow Chart**, **MVRV Z-Score** progress, and margin against the short-term (**STH-RP**) and long-term (**LTH-RP**) realized prices.
*   **Disclaimer**: Clear and visible information on the Hero, prediction tab, and footer, detailing the probabilistic and purely educational nature of the AI simulations.

---

## 🧠 How Artificial Intelligence (SCM Engine) is Used

The project adopts a **Quantitative Confluence-Based AI** approach (Specialist Systems of Deterministic Heuristics) to calculate macro bias. Instead of generic neural networks or LLMs (which generate "financial hallucinations" in numbers), the SCM (Multidimensional Confluence Score) engine simulates the logical behavior of an automated quant analyst, ensuring 100% mathematical accuracy and data reproducibility.

### 🔌 How AI is Called in the Code
Predictive intelligence is activated in the Dashboard update flow in [app.js](app.js) by calling the `runPredictionEngine` function exported by [src/indicators.js](src/indicators.js) during every chart refresh:

```javascript
const prediction = runPredictionEngine(
  currentPrice,
  { closes, ema9, ema21, ema52, sma100, sma200, rsi: stochRsi.rsi, stochK: stochRsi.k },
  fvgs,
  srLevels,
  onchain,
  currentTimeframe
);
```

### ⚙️ Analysis Logic and Decision Matrix
The engine weights the collected data, structuring the thesis into 4 pillars:
1.  **Macro Trend (40%)**: Evaluates whether the price is above the EMA 21 for the selected timeframe (primary trend) and if there is a bullish alignment (EMA 9 > 21 > 52).
2.  **Momentum & Exhaustion (20%)**: Checks for Stoch RSI divergences and whether the RSI is in extreme overbought/oversold zones.
3.  **Price Action & Liquidity (20%)**: Detects if the price is in rebalancing zones (Fair Value Gaps) and the distance to consolidated supports/resistances.
4.  **On-Chain Health (20%)**: Compares spot price with historical realized prices (STH-RP and LTH-RP) and evaluates the MVRV Z-Score standard deviation.

The consolidated result ranges from **-100 to +100**, defining the market bias (Bullish/Bearish/Neutral) and automatically outlining entry zones (Buy Zone), technical targets (Targets) based on resistances, and macro invalidation levels (Stop Loss).

---

## 📖 Detailed Documentation of the API, Modules, and Functions

The ecosystem of the **SaaS Financial Indicator** is structured in a modular fashion and is based on modern frontend software engineering concepts. Below is the description of each feature, module, constants, events, and function signatures of the project.

---

### 1. Data Aggregation Module (`src/aggregator.js`)
Located in [src/aggregator.js](src/aggregator.js), this module manages communication with the public Binance API and the grouping of historical candles into custom timeframes.

#### Available Functions:
*   #### `fetchBinanceKlines(symbol, interval, limit)`
    *   **Description**: Performs an HTTP request (`fetch`) to the public Binance REST API (`/api/v3/klines`) to fetch historical candlestick data.
    *   **Signature**: `async function fetchBinanceKlines(symbol, interval, limit = 500)`
    *   **Parameters**:
        *   `symbol` (`string`): Short asset symbol (`BTC`, `ETH`, or `SOL`). Internally mapped to the corresponding USDT pair (`BTCUSDT`, `ETHUSDT`, or `SOLUSDT`).
        *   `interval` (`string`): Native candle interval supported by Binance (e.g., `'1d'`, `'1w'`, `'1M'`).
        *   `limit` (`number`): Maximum number of candles to be returned (default `500`).
    *   **Return**: `Promise<Array<Object>>` — Array of candle objects formatted for TradingView Lightweight Charts:
        ```javascript
        {
          time: Number,  // Timestamp in seconds (UNIX Epoch)
          open: Number,  // Opening price
          high: Number,  // Maximum price reached
          low: Number,   // Minimum price reached
          close: Number, // Closing price
          volume: Number // Traded volume
        }
        ```

*   #### `aggregateCandles(candles1d, days)`
    *   **Description**: Groups daily candle data (`1d`) into custom higher time frame (HTF) intervals.
    *   **Signature**: `function aggregateCandles(candles1d, days)`
    *   **Parameters**:
        *   `candles1d` (`Array<Object>`): Array of daily candles obtained previously.
        *   `days` (`number`): Number of days to consolidate into each aggregated candle (e.g., `3` for 3-day candles, `14` for 2-week candles).
    *   **Return**: `Array<Object>` — Array of aggregated candles, where each candle has:
        *   `open`: Opening price of the first daily candle of the group.
        *   `close`: Closing price of the last daily candle of the group.
        *   `high`: Maximum price among all daily candles in the group.
        *   `low`: Minimum price among all daily candles in the group.
        *   `volume`: Sum of the volume of all daily candles in the group.
        *   `time`: The timestamp (seconds) of the first daily candle in the group.

*   #### `getCandleData(symbol, timeframe)`
    *   **Description**: High-level function that dynamically decides whether to make a direct request for native Binance timeframes or fetch daily candles and aggregate them on demand.
    *   **Signature**: `async function getCandleData(symbol, timeframe)`
    *   **Parameters**:
        *   `symbol` (`string`): The analyzed asset (`BTC`, `ETH`, or `SOL`).
        *   `timeframe` (`string`): The desired timeframe (`3d`, `1w`, `2w`, `1M`).
    *   **Return**: `Promise<Array<Object>>` — List of candles ready for consumption and chart rendering.

---

### 2. Logic and Technical Indicators Module (`src/indicators.js`)
Located in [src/indicators.js](src/indicators.js), contains the mathematical algorithms for technical indicators, candle pattern detection, and the statistical prediction engine.

#### Available Functions:
*   #### `calculateSMA(data, period)`
    *   **Description**: Simple Moving Average (SMA).
    *   **Signature**: `function calculateSMA(data, period)`
    *   **Parameters**:
        *   `data` (`Array<number>`): Base numeric data (closing prices).
        *   `period` (`number`): The moving average window size.
    *   **Return**: `Array<number>` — Array of the same size as input, containing the SMA values or `NaN` for indices prior to the required period.

*   #### `calculateEMA(data, period)`
    *   **Description**: Exponential Moving Average (EMA).
    *   **Signature**: `function calculateEMA(data, period)`
    *   **Parameters**:
        *   `data` (`Array<number>`): Price numeric data.
        *   `period` (`number`): Exponential average period.
    *   **Return**: `Array<number>` — Exponential average values calculated recursively using the smoothing multiplier $k = 2 / (period + 1)$ and initialized with the SMA of the first `period` elements.

*   #### `calculateRSI(closes, period)`
    *   **Description**: Relative Strength Index (RSI) with J. Welles Wilder's classical smoothing.
    *   **Signature**: `function calculateRSI(closes, period = 14)`
    *   **Parameters**:
        *   `closes` (`Array<number>`): Closing prices of candles.
        *   `period` (`number`): Smoothing period (default `14`).
    *   **Return**: `Array<number>` — List of RSI values fluctuating between `0` and `100` (`NaN` in initial positions).

*   #### `calculateStochRSI(closes, rsiPeriod, stochPeriod, kSmooth, dSmooth)`
    *   **Description**: Stochastic RSI (%K and %D), a momentum indicator that measures the position of the current RSI relative to its high and low values over a defined period.
    *   **Signature**: `function calculateStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3)`
    *   **Parameters**:
        *   `closes` (`Array<number>`): Closing prices of candles.
        *   `rsiPeriod`/`stochPeriod` (`number`): Period of the internal RSI and the stochastic window.
        *   `kSmooth`/`dSmooth` (`number`): Simple smoothing factors for the `%K` and `%D` lines.
    *   **Return**: `{ k: Array<number>, d: Array<number>, rsi: Array<number> }` — Structure containing both Stochastic RSI lines and the base RSI.

*   #### `detectDivergences(prices, stochRsiK, windowSize)`
    *   **Description**: Identifies regular bullish or bearish divergences in the Stochastic RSI %K line relative to local price pivots (tops/bottoms).
    *   **Signature**: `function detectDivergences(prices, stochRsiK, windowSize = 35)`
    *   **Logic**: Finds local price reversal pivots (using 2 margin candles on each side) and validates whether the indicator is showing opposing movements in overbought/oversold zones.
    *   **Return**: `{ type: 'BULLISH'|'BEARISH'|'NONE', p1Index: number, p2Index: number }`

*   #### `detectFVGs(candles)`
    *   **Description**: Locates liquidity imbalances known as Fair Value Gaps (FVG) in the price chart and checks whether they have been mitigated (filled) by future movements.
    *   **Signature**: `function detectFVGs(candles)`
    *   **Logic**: Identifies inefficiencies when Candle 3 Low > Candle 1 High (Bullish FVG) or Candle 3 High < Candle 1 Low (Bearish FVG). The FVG is marked as mitigated if subsequent candle prices cross the gap boundaries.
    *   **Return**: `Array<Object>` containing active (unmitigated) FVGs in the format:
        ```javascript
        {
          id: String,
          type: 'BULLISH' | 'BEARISH',
          topPrice: Number,
          bottomPrice: Number,
          startIndex: Number,
          isMitigated: Boolean
        }
        ```

*   #### `detectSupportResistance(candles)`
    *   **Description**: Static support and resistance identification algorithm based on pivot clustering and retest (touch) counts.
    *   **Signature**: `function detectSupportResistance(candles)`
    *   **Logic**:
        1. Finds local pivots using a 4-candle window on each side.
        2. Counts historical retests (touches within a 1.2% tolerance of the pivot price).
        3. Consolidates levels that are very close (difference under 2%), prioritizing the level with more touches.
        4. Dynamically reclassifies levels below the current spot price as **Supports** and above the current spot price as **Resistances** (Role Reversal Principle).
    *   **Return**: `{ supports: Array<number>, resistances: Array<number> }` — Limited to the 3 closest levels of each.

*   #### `runPredictionEngine(currentPrice, indicators, fvgs, sr, onchain, timeframe)`
    *   **Description**: High-frequency statistical confluence engine that weights and calculates the Multidimensional Confluence Score (SCM) of the asset for the next 60 days.
    *   **Signature**: `function runPredictionEngine(currentPrice, indicators, fvgs, sr, onchain, timeframe = '1w')`
    *   **Score Weights**:
        *   Price relative to EMA 21: $+20$ (if above) or $-20$ (if below).
        *   Moving average alignment (9 > 21 > 52): $+20$ (bullish) or $-20$ (bearish).
        *   Active Stoch RSI divergence: $+10$ (bullish) or $-10$ (bearish).
        *   RSI in Oversold/Overbought zone: $+10$ (oversold) or $-10$ (overbought).
        *   Price touching active Bullish/Bearish FVG: $+10$ (bullish gap) or $-10$ (bearish gap).
        *   Price in static Support/Resistance zone (2% tolerance): $+10$ (support) or $-10$ (resistance).
        *   Price vs Short-Term Realized Price (STH-RP): $+10$ (if above) or $-10$ (if below).
        *   Extreme MVRV Z-Score (<0.2 or >3.0): $+10$ (undervalued) or $-10$ (overvalued).
    *   **Return**: `{ score: number, bias: 'BULLISH'|'BEARISH'|'NEUTRAL', details: Array<Object> }` — The final score is normalized between `-100` and `+100`.

---

### 3. Main Frontend Controller (`app.js`)
Located in [app.js](app.js), this file is the central controller of the client application. It initializes visual interfaces, manages application state, and integrates raw data with TradingView charts.

#### Global State Variables:
*   `currentAsset` (`string`): Currently selected asset (`'BTC'`, `'ETH'`, `'SOL'`).
*   `currentTimeframe` (`string`): Active timeframe (`'3d'`, `'1w'`, `'2w'`, `'1M'`).
*   `priceChart`, `rsiChart`, `stochChart`: Main chart instances from the TradingView Lightweight Charts library.
*   `candlestickSeries`, `ema9Series`, `ema21Series`, `ema52Series`, `sma100Series`, `sma200Series`, `rsiSeries`, `stochKSeries`, `stochDSeries`: Data objects linked to charts for drawing series.
*   `activePriceLines` (`Array`): References to currently plotted support and resistance lines.

#### Life Cycle and Rendering Functions:
*   #### `getSimulatedOnChainData(asset, price)`
    *   **Description**: Simulates on-chain data in runtime proportionally to the real spot price, simulating fundamental data feeds (Rainbow band, MVRV Z-Score, and realized costs LTH-RP and STH-RP).
    *   **Signature**: `function getSimulatedOnChainData(asset, price)`

*   #### `initCharts()`
    *   **Description**: Initializes TradingView chart instances in HTML containers and synchronizes their time scales bidirectionally (zoom and horizontal scroll on one applies to the others). Also registers `ResizeObserver` for smart responsive behavior.
    *   **Signature**: `function initCharts()`

*   #### `refreshDashboard()`
    *   **Description**: Cyclic entry point executed on initialization and interface input changes.
    *   **Signature**: `async function refreshDashboard()`
    *   **Internal Flow**:
        1. Updates text badges and titles in the UI.
        2. Obtains market candles by calling `getCandleData`.
        3. Calculates basic technical indicators (EMAs, SMAs, StochRSI, FVGs, S/R).
        4. Updates chart series data and triggers automatic scroll animation to the right edge.
        5. Draws static Support and Resistance lines if the toggle is checked.
        6. Gathers simulated on-chain data.
        7. Executes the `runPredictionEngine`.
        8. Triggers the prediction panel update via `updatePredictionUI`.

*   #### `updateIndicatorVisibility(ema9, ema21, ema52, sma100, sma200)`
    *   **Description**: Maps moving average series on the price chart, showing or clearing data based on checked checkboxes in the UI.
    *   **Signature**: `function updateIndicatorVisibility(ema9, ema21, ema52, sma100, sma200)`

*   #### `updatePredictionUI(prediction, currentPrice, onchain, fvgs, srLevels, lastEma21)`
    *   **Description**: Updates all text elements and graphics of the investment thesis and expanded on-chain panel.
    *   **Signature**: `function updatePredictionUI(prediction, currentPrice, onchain, fvgs, srLevels, lastEma21)`
    *   **Logic**:
        1. Renders the score and updates the progress SVG circle (`#score-progress`), changing the stroke color.
        2. Formats the macro thesis in clear language based on calculated data coherent with the timeframe.
        3. Defines action points (Buy Zone, Targets, and Stop Loss), using the actual calculated EMA 21 value for the bearish stop.
        4. Populates the detailed confluence table.
        5. Updates the Rainbow Chart status, activating corresponding visual segments and the MVRV Z-Score progress bar.

*   #### `setupEventListeners()`
    *   **Description**: Configures click and change listeners on main Navbar tabs, sidebar asset and timeframe buttons, indicator checkboxes, and integrated documentation tabs.
    *   **Signature**: `function setupEventListeners()`

---

## 📁 File Structure

```
saas-financial-indicator/
├── docs/                        # Theoretical detailing and step-by-step guides for each module
│   ├── 1_graficos_e_timeframes.md
│   ├── 2_medias_moveis_e_indicadores.md
│   ├── 3_deteccao_divergencias.md
│   ├── 4_fvg_suporte_resistencia.md
│   ├── 5_confluencia_onchain.md
│   └── 6_estrategia_predicao.md
├── src/                         # Pure logic modules (ESM)
│   ├── aggregator.js            # Binance API data fetcher and candle aggregator (3d, 2w)
│   └── indicators.js            # SMA, EMA, RSI, StochRSI, Divergences, FVGs, and S/R calculations
├── tests/                       # Automated test scripts in Node.js
│   ├── test_aggregator.js       # Test for candle fetching and grouping
│   └── test_indicators.js       # Test for indicators and prediction engine
├── index.html                   # Documentation Landing Page & Interactive Dashboard
├── style.css                    # Modern and contemporary styling (Dark Theme Blue/Gray)
├── app.js                       # Frontend controller managing UI and TradingView charts
├── Dockerfile                   # Dockerfile containing the Nginx image
├── docker-compose.yml           # Docker Compose file for quick local orchestration
├── plano_projeto.md             # Original architecture plan
└── README.md                    # This guidance file
```

---

## 🛠️ Local Installation and Setup

Since the application is structured using native ES6 modules in the browser (`import`/`export`), opening `index.html` directly via double-click (`file://`) will trigger CORS errors. It is necessary to run the project under an HTTP server.

### Prerequisites
*   **Node.js** installed (Recommended) or **Python**.

### Step-by-Step
1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/andreporto/micro-financial-indicator.git
    cd saas-financial-indicator
    ```
2.  Start a local server:
    *   **Using Node.js (via npx)**:
        ```bash
        npx http-server -p 9080
        ```
    *   **Using Python**:
        ```bash
        python -m http.server 9080
        ```
3.  Access in your browser: **`http://localhost:9080`**

### Running Unit Tests
To validate the precision of the mathematical calculations of indicators and the candle aggregation engine from the Binance API, run the test scripts via the terminal:
```bash
# Test the Binance candle integration and aggregation
node tests/test_aggregator.js

# Test the technical indicators and SCM prediction calculations
node tests/test_indicators.js
```

---

## 🐳 Dockerization on Local Server

Dockerizing the project allows you to run the application in an isolated, lightweight manner, without needing to install Node.js or Python directly on the hosting machine.

### Method 1: Using Docker Compose (Recommended)
To run simply and quickly with a single instruction:
```bash
# Starts the container in the background on port 9080
docker compose up -d
```
To stop the container:
```bash
docker compose down
```

### Method 2: Manual Docker CLI
If you prefer to compile and run the image manually:
1.  **Build the Docker image**:
    ```bash
    docker build -t saas-financial-indicator .
    ```
2.  **Run the container**:
    ```bash
    docker run -d -p 9080:80 --name saas-financial-indicator saas-financial-indicator
    ```
3.  **Check logs**:
    ```bash
    docker logs saas-financial-indicator
    ```

The application will be available at `http://localhost:9080` running under the Nginx server embedded in the container.

---

## 🌐 Deployment to the Internet

Since the project is **100% static (Pure Frontend HTML/CSS/JS)**, there are several efficient ways to make it publicly available:

### Option A: Secure Local Server Exposure (Tunnels)
If you are running the server on a local physical machine (or Raspberry Pi) and want to access it externally without exposing ports on your router (no Port Forwarding):

1.  **Cloudflare Tunnels (Recommended & Free)**:
    *   Install `cloudflared` on your machine.
    *   Authenticate and create the tunnel:
        ```bash
        cloudflared tunnel login
        cloudflared tunnel create my-saas-tunnel
        ```
    *   Associate it with a subdomain you own:
        ```bash
        cloudflared tunnel route dns my-saas-tunnel saas.mydomain.com
        ```
    *   Start the tunnel pointing to the project's local port (either via Docker or Local Host):
        ```bash
        cloudflared tunnel run --url http://localhost:9080 my-saas-tunnel
        ```
        *Cloudflare will provide free automatic HTTPS/SSL.*

2.  **Ngrok (Fast for Testing)**:
    *   Install ngrok and execute:
        ```bash
        ngrok http 9080
        ```
    *   The terminal will provide a temporary public URL (e.g., `https://abcd-123.ngrok-free.app`).

---

### Option B: Cloud Static Hosting (Highly Recommended)
Because it has no database or dedicated backend (it consumes public APIs directly from the browser), the project is a perfect candidate for global static hosting platforms (CDNs). It is the fastest and cheapest option (usually free).

> [!IMPORTANT]
> **For Custom/Private Deployments:** If you are deploying this project for your own private use, you must create your own personal account on the hosting provider (GitHub, Vercel, Netlify, etc.), clone or fork the repository to your own GitHub account, and use your own credentials and deployment domains.

1.  **Vercel (Recommended)**:
    See the detailed step-by-step instructions in the section: [⚡ Free Deployment on Vercel](#-free-deployment-on-vercel).
2.  **Netlify**:
    *   Create a free account on Netlify.
    *   Connect your Git repository (GitHub, GitLab).
    *   Select the project directory, keeping build commands and output folders empty.
    *   Click **Deploy site** to put the project online.

3.  **GitHub Pages**:
    *   In your GitHub repository, go to **Settings** > **Pages**.
    *   Select the `main` branch and the root folder (`/`) as the source.
    *   Save. Your site will be available at `https://andreporto.github.io/micro-financial-indicator/`.

---

## ⚡ Free Deployment on Vercel

Since the project is static and consumes public APIs directly in the browser, deploying to [Vercel](https://vercel.com) is 100% free and takes less than 2 minutes.

> [!NOTE]
> **Account Setup:** Ensure you use your own Vercel account and select your own cloned repository when importing the project on the Vercel dashboard.

### Option 1: Via Vercel Dashboard (GitHub/GitLab Integration)

1.  Go to [Vercel](https://vercel.com) and create a free account (Hobby plan).
2.  In the main dashboard, click **Add New** > **Project**.
3.  Connect and authorize your **GitHub**, **GitLab**, or **Bitbucket** account.
4.  Select the `micro-financial-indicator` repository and click **Import**.
5.  In the project settings:
    *   **Framework Preset**: Select `Other`.
    *   **Root Directory**: Keep `./` (root folder).
    *   **Build and Development Settings**: Do not change anything (leave blank), since the project uses native HTML, CSS, and JS.
6.  Click the **Deploy** button. The compilation process will take only a few seconds, and your site will be live with a secure address (e.g., `https://micro-financial-indicator.vercel.app`).

### Option 2: Via Vercel CLI (Without pushing to Git)

If you want to deploy directly from your local terminal:

1.  Install the Vercel tool globally on your system via Node Package Manager:
    ```bash
    npm install -g vercel
    ```
2.  Log into the CLI (this will open a browser window for authentication):
    ```bash
    vercel login
    ```
3.  Navigate to the project root folder and run the initial setup command:
    ```bash
    vercel
    ```
4.  Answer the questions displayed in the terminal to link the project (you can press `Enter` to accept all recommended default answers).
5.  To generate the final production URL of the project, run the command:
    ```bash
    vercel --prod
    ```

Vercel will automatically generate an SSL security certificate and a stable domain for free.
