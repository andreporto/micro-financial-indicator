# Funcionalidade 5: Integração e Confluência de Dados On-Chain

Esta funcionalidade descreve a modelagem, o consumo de APIs e a lógica de confluência para as quatro métricas on-chain principais: **Rainbow Chart, MVRV Z-Score, Short-Term Holder Realized Price (STH-RP) e Long-Term Holder Realized Price (LTH-RP)**.

---

## 1. Descrição Detalhada das Métricas

Enquanto a análise técnica (gráficos e osciladores) estuda o comportamento do preço, os dados on-chain investigam o comportamento dos investidores dentro da blockchain. A combinação de ambos reduz drasticamente os falsos sinais.

### 1.1. Rainbow Chart (Gráfico Arco-Íris)
Baseado em uma regressão logarítmica que mapeia o crescimento do Bitcoin ao longo do tempo. O gráfico é dividido em 9 faixas coloridas.
* **Modelo Matemático (BTC)**:
  $$\ln(\text{Preço}) = A \cdot \ln(\text{Dias desde Epoch}) + B$$
  *(Dias calculados a partir de 09/01/2009).*
* **Faixas**:
  1. *Azul Escuro / Azul*: "Liquidação Total" (Fire Sale) / "Comprar"
  2. *Verde Claro / Verde*: "Acumular" / "Ainda Barato"
  3. *Amarelo*: "HODL!"
  4. *Laranja / Laranja Escuro*: "Isso é uma Bolha?" / "FOMO aumenta"
  5. *Vermelho / Vermelho Escuro*: "Venda, Sério!" / "Território de Bolha Máxima"

### 1.2. MVRV Z-Score
Mede o desvio padrão entre a Capitalização de Mercado e a Capitalização Realizada (o valor que de fato foi pago pelas moedas).
* **Fórmula**:
  $$\text{Z-Score} = \frac{\text{Market Cap} - \text{Realized Cap}}{\sigma(\text{Market Cap})}$$
* **Níveis de Alerta**:
  - **Z-Score < 0.1**: Zona de subvalorização extrema (Fundo Macro histórico).
  - **Z-Score > 3.0**: Zona de supervalorização (Distribuição / Topo Macro).

### 1.3. Realized Prices (Preços Realizados)
* **Short-Term Holder Realized Price (STH-RP)**: Custo médio das moedas mantidas por menos de 155 dias (especuladores / investidores de varejo recentes).
* **Long-Term Holder Realized Price (LTH-RP)**: Custo médio das moedas mantidas por mais de 155 dias (HODLers experientes / baleias).
* **Uso Estrutural**:
  - **Bull Market**: O preço se mantém acima de ambas as linhas. O reteste do STH-RP costuma marcar o fundo de correções locais.
  - **Bear Market**: O preço cai abaixo do STH-RP, transformando-o em resistência. O fundo final de capitulação geralmente ocorre no reteste do LTH-RP ou abaixo dele.

---

## 2. Passo a Passo da Implementação

### Passo 1: Aquisição de Dados (Backend Pipeline)
Os dados on-chain não são atualizados a cada segundo; uma atualização diária (1x ao dia) é suficiente.

* **Exemplo de Integração de API (Glassnode)**:
  - Endpoint STH-RP: `/v1/metrics/realized/price_non_coinstats_sth`
  - Endpoint LTH-RP: `/v1/metrics/realized/price_non_coinstats_lth`
  - Endpoint MVRV Z-Score: `/v1/metrics/market/mvrv_z_score`

*Código de Exemplo de Serviço de Sincronização:*
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
  // Integração com endpoint Glassnode ou similar
  const response = await axios.get(`https://api.glassnode.com/v1/metrics/market/mvrv_z_score`, {
    params: { a: symbol, api_key: apiKey }
  });
  
  return response.data.map((item: any) => ({
    timestamp: item.t,
    mvrvZscore: item.v
  }));
}
```

### Passo 2: Normalização e Mapeamento
Normalizar os timestamps on-chain para alinhar com os timestamps das velas do gráfico TradingView. Se o usuário estiver no gráfico de **1 semana (1w)**, extraímos a métrica on-chain correspondente ao último dia daquela semana.

### Passo 3: Criação do Widget de Confluência On-Chain
No frontend, criamos um painel informativo ao lado do gráfico:

1. **Card do Rainbow Chart**:
   - Calcula a faixa em que o BTC está hoje.
   - Mostra um indicador visual colorido com o texto da faixa atual (ex: `Acumular` em Verde).
2. **Card MVRV Z-Score**:
   - Um medidor (gauge chart) ou barra de progresso horizontal mostrando a posição atual do Z-Score em relação às zonas de risco.
3. **Cruzamento de Médias Realizadas vs Preço**:
   - Mostra a distância percentual do preço atual para o **STH-RP** e para o **LTH-RP**.
   - Exemplo: `Preço está 8% acima do STH-RP (Suporte Ativo)` ou `Preço perdeu o STH-RP por -3% (Alerta de Baixa)`.
