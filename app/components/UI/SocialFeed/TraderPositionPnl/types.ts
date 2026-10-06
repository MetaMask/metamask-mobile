/**
 * One position from `GET /api/v1/traders/position/{positionId}`.
 * Money fields are USD. Perps-only fields are null for spot.
 */
export interface TraderPosition {
  positionId: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  chain: string;
  isOpen: boolean;
  positionAmount: number;
  costBasis: number;
  currentValueUSD: number | null;
  realizedPnl: number;
  pnlValueUsd: number | null;
  /** Total PnL as a percent of `boughtUsd`, not unrealized percent. */
  pnlPercent: number | null;
  boughtUsd: number;
  soldUsd: number;
  perpPositionType: 'long' | 'short' | null;
  perpLeverage: number | null;
  positionAmountWithLeverage: number | null;
  costBasisWithLeverage: number | null;
  marginUsd: number | null;
  trades: TraderPositionTrade[];
  lastTradeAt: number;
}

export interface TraderPositionTrade {
  timestamp: number;
}

/**
 * Unrealized spot PnL in USD. Percent is of cost basis.
 * Both stay null when the position is a perp; that formula is unconfirmed.
 */
export interface UnrealizedPnl {
  usd: number | null;
  percent: number | null;
}
