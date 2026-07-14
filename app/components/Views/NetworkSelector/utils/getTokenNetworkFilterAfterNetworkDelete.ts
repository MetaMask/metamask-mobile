import { omitChainFromTokenNetworkFilter } from './omitChainFromTokenNetworkFilter';

/**
 * Builds the PreferencesController token network filter update after deleting a network.
 */
export function getTokenNetworkFilterAfterNetworkDelete(
  isAllNetwork: boolean,
  tokenNetworkFilter: Record<string, unknown>,
  chainId: string,
): Record<string, unknown> {
  if (isAllNetwork) {
    return omitChainFromTokenNetworkFilter(tokenNetworkFilter, chainId);
  }

  return { [chainId]: true };
}
