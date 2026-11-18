import { omitChainFromTokenNetworkFilter } from './omitChainFromTokenNetworkFilter';

/**
 * Builds the PreferencesController token network filter update after deleting a network.
 */
export function getTokenNetworkFilterAfterNetworkDelete(
  tokenNetworkFilter: Record<string, unknown>,
  chainId: string,
): Record<string, unknown> {
  return omitChainFromTokenNetworkFilter(tokenNetworkFilter, chainId);
}
