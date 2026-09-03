/**
 * Returns a copy of the token network filter with the given chain removed.
 */
export function omitChainFromTokenNetworkFilter(
  tokenNetworkFilter: Record<string, unknown>,
  chainId: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(tokenNetworkFilter).filter(([id]) => id !== chainId),
  );
}
