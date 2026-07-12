# Plano de Melhoria: Detecção e Renderização de Suportes/Resistências (S/R) & Carregamento Inicial

Este plano descreve as melhorias matemáticas na detecção de Suportes e Resistências, a otimização estética de sua plotagem e as correções de UX para garantir que a aplicação inicie imediatamente com dados corretos e sem falhas de renderização.

---

## 1. Melhoria Algorítmica: Suportes e Resistências Robustos

### 1.1. O Problema do Algoritmo Atual
O algoritmo original apenas identifica fundos e topos locais (pivôs) e calcula uma média de proximidade linear. Isso gera:
1. **Níveis irrelevantes**: Pivôs que foram testados apenas uma vez são tratados com a mesma relevância de zonas de reteste histórico.
2. **Poluição visual**: Muitas linhas próximas poluem a escala de preços.

### 1.2. O Novo Algoritmo de "Contagem de Toques" (Retests)
Para tornar os níveis mais "corretos", implementamos um algoritmo baseado em confluência de retestes históricos:
1. **Encontrar Pivôs Iniciais**: Filtra os topos e fundos locais (pivôs).
2. **Varredura de Retestes (Frequência de Touches)**: Para cada nível de pivô $P_j$, varremos todo o histórico de velas e contamos quantas vezes outras velas ($C_t$) tiveram sua mínima ou máxima a uma distância de $\pm 1\%$ de $P_j$.
3. **Filtro de Relevância**: Apenas níveis com pelo menos $K$ retestes (ex: $\ge 2$ toques) são considerados válidos.
4. **Fusão de Níveis Próximos (Consolidação)**: Se dois níveis fortes estiverem muito próximos, mantemos apenas o nível com o maior número de toques (retestes).
5. **Classificação**: Retornamos apenas os **3 suportes mais fortes abaixo do preço atual** e as **3 resistências mais fortes acima do preço atual**.

---

## 2. Otimização de Interface (UX/UI Discreta)

### 2.1. Plotagem Estética
Em vez de linhas grossas e opacas, as linhas S/R serão renderizadas com os seguintes parâmetros visuais no TradingView:
* **Espessura (`lineWidth`)**: Reduzida de 1.5 para **1.0** (linha fina).
* **Estilo (`lineStyle`)**: Alterado de `Dashed` (Tracejado) para **`Dotted` (Pontilhado)**. Isso minimiza a interrupção visual das velas.
* **Opacidade da Cor**:
  - Suportes: `rgba(16, 185, 129, 0.25)` (Verde translúcido).
  - Resistências: `rgba(239, 68, 68, 0.25)` (Vermelho translúcido).
* **Texto de Eixo (`title`)**: Exibido de forma discreta na escala lateral do eixo Y em vez de estender um texto longo no meio do gráfico.

---

## 3. Garantia de Carregamento Rápido e Sem Erros Visuais no Load

Para evitar o problema clássico onde o gráfico é inicializado com tamanho de `0px` ou exibe valores vazios/NaN no primeiro segundo, implementamos:

### 3.1. Estado de Carregamento (Skeleton Loading)
Adicionar um overlay de carregamento em CSS nos containers dos gráficos e nos cards de predição. O overlay desaparece apenas após o método `refreshDashboard()` concluir com sucesso a primeira carga de dados reais.

### 3.2. Tratamento de Largura Dinâmica (ResizeObserver)
Garantir que a chamada de redimensionamento `chart.resize()` ocorra imediatamente após o carregamento da janela (`window.onload`) e após a injeção do HTML, garantindo que o container já possua suas dimensões de layout fluidas calculadas pelo navegador.

---

## 4. Cronograma de Implementação

1. **Alterar `src/indicators.js`**: Reescrever a função `detectSupportResistance` aplicando a contagem de retestes.
2. **Alterar `app.js`**:
   - Ajustar as propriedades visuais da criação de `PriceLine` (estilo pontilhado e opacidade).
   - Injetar o estado visual de carregamento (Skeleton loader/Spinners).
3. **Alterar `style.css`**: Criar classes CSS para os estados de esqueleto e spinners.
4. **Alterar `index.html`**: Adicionar placeholders de loading nos elementos dinâmicos.
5. **Validar com dados reais**: Rodar testes no console e no terminal.
