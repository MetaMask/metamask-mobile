import type { Position, Trade } from '@metamask/social-controllers';
import type { TraderPosition } from './types';

/**
 * The position card only reads trade timestamps. The list parser keeps those
 * and drops the rest of each fill, so the unused trade fields stay empty.
 */
const tradeForCard = (timestamp: number): Trade => ({
  direction: 'buy',
  intent: 'enter',
  tokenAmount: 0,
  usdCost: 0,
  timestamp,
  transactionHash: '',
});

/** Shape the existing position card already renders. */
export const toComposerPosition = (position: TraderPosition): Position => ({
  positionId: position.positionId,
  tokenSymbol: position.tokenSymbol,
  tokenName: position.tokenName,
  tokenAddress: position.tokenAddress,
  chain: position.chain,
  positionAmount: position.positionAmount,
  isOpen: position.isOpen,
  boughtUsd: position.boughtUsd,
  soldUsd: position.soldUsd,
  realizedPnl: position.realizedPnl,
  costBasis: position.costBasis,
  trades: position.trades.map((trade) => tradeForCard(trade.timestamp)),
  lastTradeAt: position.lastTradeAt,
  tokenImageUrl: position.tokenImageUrl,
  currentValueUSD: position.currentValueUSD,
  pnlValueUsd: position.pnlValueUsd,
  pnlPercent: position.pnlPercent,
  perpPositionType: position.perpPositionType,
  perpLeverage: position.perpLeverage,
  positionAmountWithLeverage: position.positionAmountWithLeverage,
});
