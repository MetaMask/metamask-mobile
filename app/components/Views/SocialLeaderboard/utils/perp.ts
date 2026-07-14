import type { Position, Trade } from '@metamask/social-controllers';
import {
  getPerpsDexFromSymbol,
  getPerpsDisplaySymbol,
} from '@metamask/perps-controller';

/**
 * Chain name the social API uses for Hyperliquid perps. Hyperliquid is
 * perp-only, so a position on this chain is always a perp even when the
 * explicit `perpPositionType` marker is absent.
 */
export const HYPERLIQUID_CHAIN_NAME = 'hyperliquid';

/**
 * The only HIP-3 DEX we support trading on. HIP-3 perp symbols are namespaced
 * by their provider DEX (`xyz:SPCX`, `cash:SPCX`, `kv:…`); we route every
 * tradable market through the `xyz` provider.
 */
export const XYZ_DEX = 'xyz';

export interface SupportedXyzPerpMarket {
  /**
   * Perp market symbol the Trade CTA should open. For `xyz` and non-HIP-3
   * markets this is the original symbol; for other HIP-3 providers it is the
   * equivalent `xyz:<asset>` symbol.
   */
  targetSymbol: string;
  /**
   * True when support is conditional on `targetSymbol` actually existing in the
   * tradable market list (i.e. the position came from a non-`xyz` HIP-3
   * provider). `xyz` and non-HIP-3 markets link directly and need no check.
   */
  requiresXyzMarketCheck: boolean;
}

/**
 * Resolves which `xyz` perp market a position's symbol maps to.
 *
 * We only support `xyz` HIP-3 markets. Non-HIP-3 symbols (e.g. `BTC`) and
 * symbols already on the `xyz` provider link directly. Symbols from any other
 * HIP-3 provider (`cash:SPCX`, `kv:…`) are remapped to their `xyz` equivalent
 * (`xyz:SPCX`); the caller must confirm that market exists before linking.
 */
export function getSupportedXyzPerpMarketSymbol(
  symbol: string,
): SupportedXyzPerpMarket {
  const dex = getPerpsDexFromSymbol(symbol);
  if (dex === null || dex.toLowerCase() === XYZ_DEX) {
    return { targetSymbol: symbol, requiresXyzMarketCheck: false };
  }
  return {
    targetSymbol: `${XYZ_DEX}:${getPerpsDisplaySymbol(symbol)}`,
    requiresXyzMarketCheck: true,
  };
}

export type PerpDirection = 'long' | 'short';

type PerpPositionFields = Pick<
  Position,
  'perpPositionType' | 'chain' | 'positionAmount'
>;

type ClosedPositionFields = Pick<
  Position,
  | 'perpPositionType'
  | 'chain'
  | 'positionAmount'
  | 'soldUsd'
  | 'currentValueUSD'
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
 * True when a position has been fully closed.
 *
 * Spot positions zero out their `positionAmount` once sold, so the presence of
 * realized proceeds (`soldUsd`) marks them closed. Perps are different: a closed
 * perp keeps its (non-zero) `positionAmount` in the historical record, so we
 * instead key off the absence of remaining exposure — a closed perp reports no
 * `currentValueUSD`.
 *
 * Callers that already know the position's open/closed list membership (e.g.
 * the profile tab) should prefer that signal and use this only as a fallback.
 */
export function isClosedPosition(position: ClosedPositionFields): boolean {
  if (isPerpPosition(position)) {
    return (position.currentValueUSD ?? 0) === 0;
  }
  return position.positionAmount === 0 && position.soldUsd > 0;
}

/**
 * Resolves the side (long/short) of a perp position from Clicker's explicit
 * `perpPositionType`. Returns `null` when it is absent: Clicker reports perp
 * size as a positive magnitude and conveys direction only via
 * `perpPositionType`, so the sign of `positionAmount` is not a reliable
 * direction signal (e.g. Hyperliquid spot tokens can carry a negative amount
 * with no side). Returns `null` for spot.
 */
export function getPerpPositionDirection(
  position: PerpPositionFields,
): PerpDirection | null {
  return position.perpPositionType ?? null;
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
