import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export interface CardFeature {
  [chainId: string]: SupportedChain | undefined;
}

export interface SupportedChain {
  enabled?: boolean | null;
  tokens?: SupportedToken[] | null;
}

export interface SupportedToken {
  address?: string | null;
  decimals?: number | null;
  enabled?: boolean | null;
  name?: string | null;
  symbol?: string | null;
}

export const selectCardFeature = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const cardFeature = remoteFeatureFlags?.cardFeature;
    return (cardFeature ?? {}) as CardFeature | null;
  },
);
