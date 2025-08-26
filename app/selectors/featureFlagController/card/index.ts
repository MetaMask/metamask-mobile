import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export interface CardFeatureFlag {
  constants?: Record<string, string>;
  chains?: Record<string, SupportedChain>;
}

export interface SupportedChain {
  enabled?: boolean | null;
  balanceScannerAddress?: `0x${string}` | null;
  foxConnectAddresses?: {
    global?: `0x${string}` | null;
    us?: `0x${string}` | null;
  };
  tokens?: SupportedToken[] | null;
}

export interface SupportedToken {
  address?: string | null;
  decimals?: number | null;
  enabled?: boolean | null;
  name?: string | null;
  symbol?: string | null;
}

export const selectCardFeatureFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const cardFeatureFlag = remoteFeatureFlags?.cardFeature;
    return (cardFeatureFlag ?? null) as CardFeatureFlag | null;
  },
);
