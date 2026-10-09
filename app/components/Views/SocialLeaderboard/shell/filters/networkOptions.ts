import type { SocialFilterNetwork, SocialFilterType } from './types';
import { NETWORK_OPTIONS } from './filterDefaults';

/**
 * Networks valid for a given `type`. The unified sheet resets `network` to
 * `all` when the user switches `type` and the current network is no longer
 * valid. Today every type supports the full network set, so this is a
 * no-op — the mapping exists so the behaviour can be tightened per type
 * without touching the sheet.
 */
export const NETWORKS_BY_TYPE: Record<
  SocialFilterType,
  readonly SocialFilterNetwork[]
> = {
  all: NETWORK_OPTIONS,
  tokens: NETWORK_OPTIONS,
  perps: NETWORK_OPTIONS,
  predictions: NETWORK_OPTIONS,
};

/**
 * Returns the network that should be selected after `type` changes. If the
 * currently-selected network is still valid for the new type, keep it;
 * otherwise reset to `all`.
 */
export function resolveNetworkForType(
  nextType: SocialFilterType,
  currentNetwork: SocialFilterNetwork,
): SocialFilterNetwork {
  const valid = NETWORKS_BY_TYPE[nextType];
  return valid.includes(currentNetwork) ? currentNetwork : 'all';
}
