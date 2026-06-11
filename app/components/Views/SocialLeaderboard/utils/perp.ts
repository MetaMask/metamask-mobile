import type { Position, Trade } from '@metamask/social-controllers';

/**
 * Chain name the social API uses for Hyperliquid perps. Hyperliquid is
 * perp-only, so a position on this chain is always a perp even when the
 * explicit `perpPositionType` marker is absent.
 */
export const HYPERLIQUID_CHAIN_NAME = 'hyperliquid';

export type PerpDirection = 'long' | 'short';

type PerpPositionFields = Pick<
  Position,
  'perpPositionType' | 'chain' | 'positionAmount'
>;

type PerpTradeFields = Pick<
  Trade,
  'classification' | 'perpPositionType' | 'direction'
>;

/**
 * True when a position represents a perpetual (leveraged) position rather than
 * a spot holding. A position is a perp when it carries an explicit
 * `perpPositionType` or lives on the Hyperliquid (perp-only) chain — mirroring
 * the classification the social API / Clicker use upstream.
 */
export function isPerpPosition(position: PerpPositionFields): boolean {
  return (
    position.perpPositionType != null ||
    position.chain?.toLowerCase() === HYPERLIQUID_CHAIN_NAME
  );
}

/**
 * Resolves the side (long/short) of a perp position. Prefers the explicit
 * `perpPositionType`; for Hyperliquid positions that omit it, infers from the
 * sign of `positionAmount` (negative → short). Returns `null` for spot.
 */
export function getPerpPositionDirection(
  position: PerpPositionFields,
): PerpDirection | null {
  if (position.perpPositionType) {
    return position.perpPositionType;
  }
  if (position.chain?.toLowerCase() === HYPERLIQUID_CHAIN_NAME) {
    return (position.positionAmount ?? 0) < 0 ? 'short' : 'long';
  }
  return null;
}

/**
 * True when an individual trade is a perp fill (explicit `'perp'`
 * classification or a `perpPositionType`).
 */
export function isPerpTrade(trade: PerpTradeFields): boolean {
  return trade.classification === 'perp' || trade.perpPositionType != null;
}

/**
 * Resolves the side (long/short) of a perp trade. Prefers `perpPositionType`;
 * for perp-classified fills that omit it, infers from `direction`
 * (buy → long, sell → short). Returns `null` for spot trades.
 */
export function getPerpTradeDirection(
  trade: PerpTradeFields,
): PerpDirection | null {
  if (trade.perpPositionType) {
    return trade.perpPositionType;
  }
  if (trade.classification === 'perp') {
    return trade.direction === 'sell' ? 'short' : 'long';
  }
  return null;
}
