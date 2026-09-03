import {
  CaipChainId,
  hasProperty,
  isCaipChainId,
  isPlainObject,
} from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const CHAIN_VALUE_ORDER_OVERRIDE_KEY = 'swapsChainValueOrderOverride';

export interface PromotedChain {
  chainId: CaipChainId;
  name: string;
}

const EMPTY_POSITION_OVERRIDES: readonly PromotedChain[] = Object.freeze([]);

function isPromotedChainEntry(value: unknown): value is PromotedChain {
  return (
    isPlainObject(value) &&
    hasProperty(value, 'chainId') &&
    isCaipChainId(value.chainId) &&
    hasProperty(value, 'name') &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0
  );
}

/**
 * Parses the controller-processed chain value order override configuration.
 *
 * Version resolution is performed by RemoteFeatureFlagController before this
 * selector receives the flag value.
 *
 * @param value - Processed remote feature flag value.
 * @returns Ordered promoted chains; empty when missing or malformed.
 */
export function parsePositionOverrides(
  value: unknown,
): readonly PromotedChain[] {
  if (
    !isPlainObject(value) ||
    !hasProperty(value, 'positionOverrides') ||
    !Array.isArray(value.positionOverrides)
  ) {
    return EMPTY_POSITION_OVERRIDES;
  }

  const seenChainIds = new Set<CaipChainId>();
  const promotedChains: PromotedChain[] = [];

  for (const entry of value.positionOverrides) {
    if (!isPromotedChainEntry(entry) || seenChainIds.has(entry.chainId)) {
      continue;
    }

    seenChainIds.add(entry.chainId);
    promotedChains.push({
      chainId: entry.chainId,
      name: entry.name,
    });
  }

  return promotedChains.length > 0 ? promotedChains : EMPTY_POSITION_OVERRIDES;
}

export const selectChainValueOrderOverride = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): readonly PromotedChain[] =>
    parsePositionOverrides(remoteFeatureFlags[CHAIN_VALUE_ORDER_OVERRIDE_KEY]),
);
