/** Builds the chain-scoped test ID exposed by a Bridge token selector row. */
export function getTokenSelectorItemTestId(
  chainId: string,
  symbol: string,
): string {
  return `asset-${chainId}-${symbol}`;
}
