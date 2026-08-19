/**
 * Lighter API Adapter Utilities
 *
 * Adapters transforming zkLighter REST payloads into the MetaMask Perps API
 * canonical types. Portable: no mobile-specific imports; formatters are
 * injected via the MarketDataFormatters interface (same pattern as
 * myxAdapter.ts).
 *
 * Key differences from HyperLiquid:
 * - Prices/sizes are human-readable decimal strings in REST responses, but
 *   integers scaled by `supported_*_decimals` on the signing path.
 * - Position side is a `sign` field (1 = long, -1 = short).
 * - USDC collateral, single margin mode per account in the POC (cross).
 */
import type { AccountState, MarketDataFormatters, MarketInfo, Order, OrderFill, PerpsMarketData, Position, PriceUpdate } from "../types/index.cjs";
import type { LighterApiOrder, LighterApiPosition, LighterOrderBookDetail, LighterOrderBookMeta, LighterRestTrade, LighterWsTrade, LighterSubAccount, LighterWsMarketStat, LighterWsUserStats } from "../types/lighter-types.cjs";
/**
 * Transform a Lighter order book meta entry into canonical MarketInfo.
 *
 * @param market - Market metadata from `GET /api/v1/orderBooks`.
 * @returns MetaMask Perps API market info object.
 */
export declare function adaptMarketFromLighter(market: LighterOrderBookMeta): MarketInfo;
/**
 * Transform a Lighter order book detail into UI-ready PerpsMarketData.
 *
 * @param detail - Market stats from `GET /api/v1/orderBookDetails`.
 * @param formatters - Injectable formatters for platform-agnostic formatting.
 * @returns MetaMask Perps API market data object.
 */
export declare function adaptMarketDataFromLighter(detail: LighterOrderBookDetail, formatters: MarketDataFormatters): PerpsMarketData;
/**
 * Transform a Lighter order book detail into a canonical PriceUpdate for
 * price-stream subscribers (REST polling stands in for a WS feed in the POC).
 *
 * @param detail - Market stats from `GET /api/v1/orderBookDetails`.
 * @param timestamp - Update timestamp (injected for determinism in tests).
 * @returns MetaMask Perps API price update object.
 */
export declare function adaptPriceUpdateFromLighter(detail: LighterOrderBookDetail, timestamp: number): PriceUpdate;
/**
 * Transform a `market_stats` WebSocket entry into a canonical PriceUpdate.
 * Richer than the REST fallback: carries mid/bid/ask, mark price, and funding.
 *
 * @param stat - Market stats entry from the `market_stats/all` WS channel.
 * @param timestamp - Update timestamp (injected for determinism in tests).
 * @returns MetaMask Perps API price update object.
 */
export declare function adaptPriceUpdateFromLighterWsStat(stat: LighterWsMarketStat, timestamp: number): PriceUpdate;
/**
 * Transform a `user_stats` WebSocket stats block into canonical AccountState.
 *
 * @param stats - Stats block from the `user_stats/{account_index}` channel.
 * @returns MetaMask Perps API account state object.
 */
export declare function adaptAccountStateFromLighterUserStats(stats: LighterWsUserStats): AccountState;
/**
 * Transform a Lighter trade (REST `/trades` or WS `account_all_trades`) into
 * a canonical OrderFill from the perspective of `accountIndex`.
 *
 * @param trade - Trade entry (post-camelization).
 * @param symbol - Market symbol resolved from the market id.
 * @param accountIndex - The account whose perspective determines the side.
 * @returns MetaMask Perps API order fill object.
 */
/**
 * Derive the lifecycle direction of a fill from the venue's
 * position-before context, in the vocabulary client transforms consume
 * (`Open Long`, `Close Short`, `Long > Short`, ...).
 *
 * The venue reports the side's ABSOLUTE position size before the trade and
 * whether its sign changed. Combined with the trade side that is enough:
 * buying reduces shorts and opens longs; selling reduces longs and opens
 * shorts. A partial fill with no sign change is disambiguated by realized
 * pnl (closing realizes pnl, opening does not). Without position context
 * the side-only `Buy`/`Sell` vocabulary is used.
 *
 * @param context - Trade side, size, and position-before data.
 * @param context.isBuy - Whether our side bought.
 * @param context.size - Trade size (base units, absolute).
 * @param context.positionBefore - Our side's absolute position size before.
 * @param context.signChanged - Whether our side's position sign changed.
 * @param context.pnl - Realized pnl for our side.
 * @returns Client-facing direction string.
 */
export declare function deriveLighterFillDirection(context: {
    isBuy: boolean;
    size: number;
    positionBefore: number;
    signChanged: boolean | undefined;
    pnl: number;
}): string;
export declare function adaptFillFromLighterTrade(trade: LighterRestTrade | LighterWsTrade, symbol: string, accountIndex: number): OrderFill;
/**
 * Transform a Lighter account position into canonical Position.
 *
 * @param position - Position entry from an account payload.
 * @param maxLeverage - Per-market max leverage (venue margin fractions).
 * @returns MetaMask Perps API position object.
 */
export declare function adaptPositionFromLighter(position: LighterApiPosition, maxLeverage?: number): Position;
/**
 * Transform a Lighter sub-account into canonical AccountState.
 *
 * @param account - Sub-account payload from `account`/`accountsByL1Address`.
 * @returns MetaMask Perps API account state object.
 */
export declare function adaptAccountStateFromLighter(account: LighterSubAccount): AccountState;
/**
 * Transform a Lighter active order into canonical Order.
 *
 * @param order - Order entry from `GET /api/v1/accountActiveOrders`.
 * @param symbol - Market symbol for the order's `marketIndex`.
 * @returns MetaMask Perps API order object.
 */
export declare function adaptOrderFromLighter(order: LighterApiOrder, symbol: string): Order;
//# sourceMappingURL=lighterAdapter.d.cts.map