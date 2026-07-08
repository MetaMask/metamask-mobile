import type { TrendingAsset } from '@metamask/assets-controllers';
import React, { useEffect, useMemo, useRef } from 'react';
import { QuickBuy } from '../../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/quickBuy';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from '../../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/features';
import type { QuickBuyTarget } from '../../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/types';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  useSocialLeaderboardAnalytics,
  SocialLeaderboardEventProperties,
  type QuickBuySheetSource,
} from '../../../../Views/SocialLeaderboard/analytics';

export interface TrendingQuickBuyProps {
  token: TrendingAsset | null;
  onClose: () => void;
  /** Analytics surface identifier. Defaults to `'explore_search'`. */
  source?: QuickBuySheetSource;
}

const TrendingQuickBuy: React.FC<TrendingQuickBuyProps> = ({
  token,
  onClose,
  source = 'explore_search',
}) => {
  const { track } = useSocialLeaderboardAnalytics();
  const prevTokenRef = useRef<TrendingAsset | null>(null);

  const target = useMemo((): QuickBuyTarget | null => {
    if (!token) return null;
    const [caipChainId, assetIdentifier] = token.assetId.split('/');
    if (!caipChainId) return null;
    const isNative = assetIdentifier?.startsWith('slip44:');
    const tokenAddress = isNative
      ? NATIVE_SWAPS_TOKEN_ADDRESS
      : (assetIdentifier?.split(':')[1] ?? '');
    return {
      chain: caipChainId as QuickBuyTarget['chain'],
      tokenAddress,
      tokenSymbol: token.symbol ?? '',
      tokenName: token.name ?? '',
    };
  }, [token]);

  useEffect(() => {
    if (token && !prevTokenRef.current) {
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED, {
        [SocialLeaderboardEventProperties.SOURCE]: source,
        [SocialLeaderboardEventProperties.CAIP19]: token.assetId,
        ...(typeof token.marketCap === 'number'
          ? { [SocialLeaderboardEventProperties.MARKET_CAP]: token.marketCap }
          : {}),
      });
    }
    prevTokenRef.current = token;
  }, [token, track, source]);

  return (
    <QuickBuy.Root
      isVisible={!!token}
      target={target}
      onClose={onClose}
      features={TOP_TRADERS_QUICK_BUY_FEATURES}
      analyticsContext={{ source }}
    />
  );
};

export default TrendingQuickBuy;
