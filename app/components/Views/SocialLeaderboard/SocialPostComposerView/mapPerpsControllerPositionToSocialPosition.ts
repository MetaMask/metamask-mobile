import {
  getPerpsDisplaySymbol,
  type Position as PerpsPosition,
} from '@metamask/perps-controller';
import type { Position as SocialPosition } from '@metamask/social-controllers';
import { HYPERLIQUID_CHAIN_NAME } from '../utils/perp';

const parseAmount = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Maps a live Perps-controller position into the social `Position` shape so the
 * composer picker can show wallet perps before Clicker indexes them.
 */
export const mapPerpsControllerPositionToSocialPosition = (
  position: PerpsPosition,
): SocialPosition => {
  const size = parseAmount(position.size);
  const absoluteSize = Math.abs(size);
  const entryPrice = parseAmount(position.entryPrice);
  const positionValue = parseAmount(position.positionValue);
  const unrealizedPnl = parseAmount(position.unrealizedPnl);
  const leverage = position.leverage?.value ?? 1;
  const displaySymbol = getPerpsDisplaySymbol(position.symbol);
  const direction = size >= 0 ? 'long' : 'short';
  const costBasis = entryPrice * absoluteSize;
  const marginUsd =
    parseAmount(position.marginUsed) ||
    (leverage > 0 ? costBasis / leverage : costBasis);

  return {
    positionId: `perps-local-${position.symbol}`,
    tokenSymbol: displaySymbol,
    tokenName: displaySymbol,
    tokenAddress: '',
    chain: HYPERLIQUID_CHAIN_NAME,
    positionAmount: absoluteSize,
    positionAmountWithLeverage: absoluteSize,
    boughtUsd: costBasis,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: positionValue,
    pnlValueUsd: unrealizedPnl,
    pnlPercent: marginUsd > 0 ? (unrealizedPnl / marginUsd) * 100 : 0,
    perpPositionType: direction,
    perpLeverage: leverage,
  };
};
