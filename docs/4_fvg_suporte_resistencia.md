# Funcionalidade 4: Fair Value Gaps (FVG) e Zonas de Suporte/Resistência (S/R)

Esta funcionalidade é dedicada ao mapeamento automático de desequilíbrios de preço (Fair Value Gaps - FVG) e à demarcação de zonas macro de suporte e resistência no gráfico.

---

## 1. Fair Value Gaps (FVG)

Um **Fair Value Gap (FVG)** ocorre quando há uma vela central de forte expansão impulsionada por um desequilíbrio entre a oferta e a demanda, deixando um espaço que o preço tende a revisitar para reequilibrar o mercado (mitigação).

### 1.1. Lógica de Identificação (3 Velas consecutivas: $C_1, C_2, C_3$)

* **Bullish FVG (Gap de Alta)**:
  - Condição: A mínima da Vela 3 ($Low_3$) é estritamente maior que a máxima da Vela 1 ($High_1$).
  - Zona do FVG: Intervalo $[High_1, Low_3]$.
  - Representação Visual: Retângulo verde translúcido estendendo-se para a direita.

* **Bearish FVG (Gap de Baixa)**:
  - Condição: A máxima da Vela 3 ($High_3$) é estritamente menor que a mínima da Vela 1 ($Low_1$).
  - Zona do FVG: Intervalo $[High_3, Low_1]$.
  - Representação Visual: Retângulo vermelho/rosa translúcido estendendo-se para a direita.

```
   Bullish FVG (Visual):
   
   Vela 3 (Alta)   |---| (Mínima = Low3)
                   |   |
   ================|===|============== [Limite Superior do FVG = Low3]
   Vela 2 (Impulso)|   | (Vela Gigante sem pavios sobrepostos)
   ================|===|============== [Limite Inferior do FVG = High1]
                   |   |
   Vela 1 (Alta)   |---| (Máxima = High1)
```

### 1.2. Algoritmo de Mitigação (Preenchimento do FVG)
Um FVG permanece "ativo" até que o preço de velas futuras cruze completamente a zona do gap:
* Para um **Bullish FVG**: Se o preço de fechamento ou mínima de qualquer vela subsequente for menor ou igual ao limite inferior ($High_1$), o FVG é marcado como *mitigado* (removido do gráfico).
* Para um **Bearish FVG**: Se a máxima ou fechamento de qualquer vela subsequente for maior ou igual ao limite superior ($Low_1$), o FVG está *mitigado*.

---

## 2. Zonas de Suporte e Resistência (S/R)

Em vez de linhas finas que geram falsos rompimentos, definimos **zonas** com base em pivôs de alta relevância (Swing Highs/Lows) no gráfico semanal e mensal.

### 2.1. Lógica de Agrupamento (Clustering)
1. **Identificar Pivôs**: Encontrar topos e fundos locais importantes ($Swing\ Highs$ e $Swing\ Lows$).
2. **Agrupamento de Proximidade**: Se dois ou mais pivôs estiverem dentro de uma distância de $\pm 1.5\%$ do preço de cada um, agrupamos esses níveis em uma única **Zona S/R**.
3. **Cálculo da Zona**:
   - A borda superior da zona é a máxima dos pavios dos pivôs agrupados.
   - A borda inferior é a mínima dos fechamentos/aberturas dos pivôs agrupados (corpos das velas).
4. **Força do Suporte/Resistência**: Contar quantas vezes o preço tocou e respeitou a zona. Zonas com mais toques ganham maior opacidade e espessura na interface.

---

## 3. Código Exemplo (TypeScript)

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
    const c2 = candles[i - 1]; // Vela do meio (forte expansão)
    const c3 = candles[i];

    // 1. Detectar Bullish FVG
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

    // 2. Detectar Bearish FVG
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

  // Verificar Mitigação ao longo do histórico
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

## 4. Renderização no TradingView
No `@tradingview/lightweight-charts`, desenhamos retângulos usando a funcionalidade de marcação ou linhas de preço (`PriceLine` / custom drawings) para cobrir o intervalo de tempo do FVG ativo:
* Retângulos Bullish FVG ativos são exibidos em verde translúcido (`rgba(16, 185, 129, 0.15)`).
* Retângulos Bearish FVG ativos em vermelho translúcido (`rgba(239, 68, 68, 0.15)`).
