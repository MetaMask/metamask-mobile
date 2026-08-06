import {
  CaipChainId,
  hasProperty,
  isCaipChainId,
  isPlainObject,
} from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const CHAIN_VALUE_ORDER_KEY = 'swapsChainValueOrder';

export interface NetworkPositionOverride {
  name: string;
  position: number;
}

export type NetworkPositionOverrides = Partial<
  Record<CaipChainId, NetworkPositionOverride>
>;

const EMPTY_POSITION_OVERRIDES: NetworkPositionOverrides = Object.freeze({});

function isNetworkPositionOverride(
  value: unknown,
): value is NetworkPositionOverride {
  return (
    isPlainObject(value) &&
    hasProperty(value, 'name') &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    hasProperty(value, 'position') &&
    typeof value.position === 'number' &&
    Number.isInteger(value.position) &&
    value.position >= 0
  );
}

/**
 * Parses the controller-processed network value order configuration.
 *
 * Version resolution is performed by RemoteFeatureFlagController before this
 * selector receives the flag value.
 *
 * @param value - Processed remote feature flag value.
 * @returns Valid position overrides keyed by CAIP-2 chain ID.
 */
export function parseNetworkPositionOverrides(
  value: unknown,
): NetworkPositionOverrides {
  if (
    !isPlainObject(value) ||
    !hasProperty(value, 'positionOverrides') ||
    !isPlainObject(value.positionOverrides)
  ) {
    return EMPTY_POSITION_OVERRIDES;
  }

  const positionOverrides = Object.entries(
    value.positionOverrides,
  ).reduce<NetworkPositionOverrides>(
    (validOverrides, [chainId, positionOverride]) => {
      if (
        isCaipChainId(chainId) &&
        isNetworkPositionOverride(positionOverride)
      ) {
        validOverrides[chainId] = positionOverride;
      }

      return validOverrides;
    },
    {},
  );

  return Object.keys(positionOverrides).length > 0
    ? positionOverrides
    : EMPTY_POSITION_OVERRIDES;
}

export const selectNetworkPositionOverrides = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): NetworkPositionOverrides =>
    parseNetworkPositionOverrides(remoteFeatureFlags[CHAIN_VALUE_ORDER_KEY]),
);
