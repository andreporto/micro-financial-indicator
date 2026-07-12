# Funcionalidade 2: Médias Móveis (MA/EMA) e Indicadores Técnicos (RSI/Stoch RSI)

Esta funcionalidade descreve a lógica de cálculo e plotagem das médias móveis de 9, 21, 52, 100 e 200 períodos, bem como dos osciladores RSI e Stochastic RSI nos gráficos.

---

## 1. Descrição Detalhada
Os indicadores ajudam a filtrar o ruído de curto prazo e revelam a direção da tendência e as zonas de exaustão do preço.
* **Médias Rápidas (EMA 9, EMA 21)**: Seguem a tendência imediata do preço.
* **Média Intermediária (EMA 52)**: Funciona como suporte/resistência chave de médio prazo.
* **Médias Lentas (SMA 100, SMA 200)**: Definem o viés macro (Bull/Bear Market).
* **RSI (14)**: Mede a velocidade e a mudança dos movimentos de preço.
* **Stoch RSI (14, 14, 3, 3)**: Combina o RSI com o oscilador estocástico para encontrar picos e fundos mais rápidos no HTF.

---

## 2. Fórmulas Matemáticas e Métodos de Cálculo

### 2.1. Média Móvel Simples (SMA)
Calcula a média aritmética dos preços de fechamento sobre um período $N$.
$$\text{SMA}_t = \frac{\sum_{i=0}^{N-1} \text{Close}_{t-i}}{N}$$

### 2.2. Média Móvel Exponencial (EMA)
Dá mais peso aos preços mais recentes. O multiplicador é $k = 2 / (N + 1)$.
$$\text{EMA}_t = (\text{Close}_t \times k) + (\text{EMA}_{t-1} \times (1 - k))$$
*Para a primeira vela, o valor inicial da EMA é simplesmente a sua SMA correspondente.*

### 2.3. Índice de Força Relativa (RSI)
$$\text{RSI} = 100 - \frac{100}{1 + \text{RS}}$$
Onde $\text{RS} = \frac{\text{Média dos Ganhos}}{\text{Média das Perdas}}$ no período de 14 dias (suavização de Wilder).

### 2.4. Stochastic RSI (Stoch RSI)
Mede o nível do RSI em relação ao seu intervalo de variação de alta/baixa durante um período (geralmente 14).
$$\text{StochRSI} = \frac{\text{RSI} - \min(\text{RSI}, 14)}{\max(\text{RSI}, 14) - \min(\text{RSI}, 14)}$$
* A linha **%K** é a média móvel simples (geralmente 3 períodos) do StochRSI bruto.
* A linha **%D** é a média móvel simples (geralmente 3 períodos) da linha %K.

---

## 3. Passo a Passo da Implementação

### Passo 1: Algoritmos de Cálculo em TypeScript
Para evitar problemas de compilação com pacotes nativos (C++), implementamos as funções de cálculo puras:

```typescript
// Exemplo de cálculo de SMA
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Dados insuficientes
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Exemplo de cálculo de EMA
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let previousEma = 0;

  // Inicializar primeira vela válida com a SMA correspondente
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

### Passo 2: Vinculação de Séries de Médias no TradingView
No frontend, criamos linhas adicionais sobrepostas no gráfico principal de velas:

```typescript
const colors = {
  ema9: '#3b82f6',   // Azul
  ema21: '#f59e0b',  // Laranja
  ema52: '#10b981',  // Verde
  sma100: '#8b5cf6', // Roxo
  sma200: '#ef4444'  // Vermelho
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

### Passo 3: Criação do Subgráfico dos Osciladores
RSI e Stochastic RSI possuem escalas fixas de 0 a 100. Eles devem ser exibidos em painéis dedicados abaixo do gráfico principal:

1. **Painel do RSI**:
   * Linha horizontal pontilhada em **30** (survenda) e **70** (sobrecompra).
   * Linha de sinal do RSI (geralmente roxa).
2. **Painel do Stochastic RSI**:
   * Linha horizontal pontilhada em **20** e **80**.
   * Duas linhas: **%K** (geralmente azul, rápida) e **%D** (geralmente laranja, lenta).
   * Preenchimento translúcido entre as linhas de limite (20-80).
