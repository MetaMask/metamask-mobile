import type { CaipAssetType } from '@metamask/utils';

/**
 * Store key for one streamed price. Spot assets key on their CAIP-19 id, perps
 * on the Hyperliquid market symbol, so two cards on the same asset share one
 * subscription.
 */
export type SocialLivePriceKey = `spot:${CaipAssetType}` | `perp:${string}`;

/**
 * Everything an open position card needs to re-derive its figures from a live
 * price. Built once at map time from the API snapshot, so a tick only does
 * arithmetic.
 */
export interface SocialLivePriceSource {
  key: SocialLivePriceKey;
  kind: 'spot' | 'perp';
  /** CAIP-19 id for the `market-data.v1` channel. Spot only. */
  assetId?: CaipAssetType;
  /** Hyperliquid market symbol (`BTC`, `xyz:NVDA`). Perps only. */
  symbol?: string;
  /** Absolute position size in tokens. */
  positionAmount: number;
  /** `1` for spot holdings and longs, `-1` for shorts. */
  direction: 1 | -1;
  /** Unit price the API's P&L was computed at, when it reported one. */
  snapshotPrice: number | null;
  /** The API's unrealized P&L in USD at `snapshotPrice`. */
  snapshotPnlUsd: number | null;
  /** Average entry price, used when the snapshot is incomplete. */
  entryPrice: number | null;
  /** USD the P&L percent is measured against. */
  pnlBaseUsd: number | null;
  /** Market cap per unit of price, for the spot `(MC)` subtitle. */
  marketCapPerPrice: number | null;
}

/** Figures an open card renders, recomputed from a live price. */
export interface SocialLivePositionFigures {
  price: number;
  pnlUsd: number | null;
  pnlPercent: number | null;
  marketCapUsd: number | null;
}
