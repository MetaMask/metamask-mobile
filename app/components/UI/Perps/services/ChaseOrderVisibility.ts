const visibleSymbolCounts = new Map<string, number>();

/** Registers Chase symbols that are currently rendered in the active Pro tab. */
export const registerVisibleChaseOrderSymbols = (
  symbols: readonly string[],
) => {
  const uniqueSymbols = [...new Set(symbols)];
  uniqueSymbols.forEach((symbol) => {
    visibleSymbolCounts.set(symbol, (visibleSymbolCounts.get(symbol) ?? 0) + 1);
  });
  return () => {
    uniqueSymbols.forEach((symbol) => {
      const nextCount = (visibleSymbolCounts.get(symbol) ?? 1) - 1;
      if (nextCount <= 0) {
        visibleSymbolCounts.delete(symbol);
      } else {
        visibleSymbolCounts.set(symbol, nextCount);
      }
    });
  };
};

export const isChaseOrderSymbolVisible = (symbol: string) =>
  visibleSymbolCounts.has(symbol);

export const resetChaseOrderVisibilityForTests = () => {
  visibleSymbolCounts.clear();
};
