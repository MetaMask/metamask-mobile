import React, { useMemo } from 'react';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import { QuickBuy } from '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/quickBuy';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/features';
import type {
  QuickBuyTarget,
  QuickBuyAnalyticsContext,
} from '../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/types';
import type { TokenDetailsRouteParams } from '../constants/constants';

export interface AssetDetailsQuickBuyProps {
  isVisible: boolean;
  token: TokenDetailsRouteParams | null;
  onClose: () => void;
}

const ANALYTICS_CONTEXT: QuickBuyAnalyticsContext = { source: 'asset_details' };

/**
 * Asset Details host adapter for QuickBuy. Maps `TokenI.chainId` (hex or CAIP)
 * into the canonical `CaipChainId` expected by `QuickBuyTarget`. Returns a
 * `null` target (sheet stays inert) when the token has no `chainId` or the
 * value can't be normalized.
 */
const AssetDetailsQuickBuy: React.FC<AssetDetailsQuickBuyProps> = ({
  isVisible,
  token,
  onClose,
}) => {
  // Read only the primitive fields the target depends on, so unrelated
  // `TokenDetailsRouteParams` changes (balance, price, etc.) don't produce a
  // new `target` reference and trigger downstream quote re-fetches.
  const chainId = token?.chainId;
  const tokenAddress = token?.address;
  const tokenSymbol = token?.symbol;
  const tokenName = token?.name;

  const target = useMemo<QuickBuyTarget | null>(() => {
    if (
      !chainId ||
      tokenAddress === undefined ||
      tokenSymbol === undefined ||
      tokenName === undefined
    ) {
      return null;
    }
    let chain: CaipChainId | undefined;
    try {
      chain = formatChainIdToCaip(chainId as Hex);
    } catch {
      chain = undefined;
    }
    if (!chain) return null;
    return {
      tokenAddress,
      tokenSymbol,
      tokenName,
      chain,
    };
  }, [chainId, tokenAddress, tokenSymbol, tokenName]);

  return (
    <QuickBuy.Root
      isVisible={isVisible}
      target={target}
      onClose={onClose}
      features={TOP_TRADERS_QUICK_BUY_FEATURES}
      analyticsContext={ANALYTICS_CONTEXT}
    />
  );
};

export default AssetDetailsQuickBuy;
