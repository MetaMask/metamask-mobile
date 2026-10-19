import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { caipChainIdToTradeInFlightChain } from '../../SocialFeed/utils/chainMapping';
import type { TokenDetailsRouteParams } from '../constants/constants';
import type { OpenPositionPnl, TraderPosition } from './types';

/**
 * Builds the composer card from `GET /api/v2/traders/{wallet}/{asset}/open`.
 * That body has the position figures and no position uid or trades, so the
 * card uses the token on screen for identity.
 */
export const toSharePosition = (
  token: TokenDetailsRouteParams,
  assetId: string | null | undefined,
  position: OpenPositionPnl,
  nowMs: number = Date.now(),
): TraderPosition | null => {
  if (!position.isOpen) {
    return null;
  }

  const chainId =
    assetId && isCaipAssetType(assetId)
      ? parseCaipAssetType(assetId).chainId
      : undefined;

  return {
    positionId: assetId ?? token.address,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    tokenAddress: token.address,
    chain: chainId ? (caipChainIdToTradeInFlightChain(chainId) ?? chainId) : '',
    isOpen: true,
    positionAmount: position.positionAmount,
    costBasis: position.costBasis,
    currentValueUSD: position.currentValueUSD,
    realizedPnl: position.realizedPnl,
    pnlValueUsd: position.pnlValueUsd,
    pnlPercent: position.pnlPercent,
    boughtUsd: position.boughtUsd,
    soldUsd: position.soldUsd,
    perpPositionType: null,
    perpLeverage: null,
    positionAmountWithLeverage: null,
    costBasisWithLeverage: null,
    marginUsd: null,
    trades: [],
    // The composer treats a missing timestamp as a one-minute hold.
    lastTradeAt: nowMs,
    tokenImageUrl: token.image || token.logo || null,
  };
};
