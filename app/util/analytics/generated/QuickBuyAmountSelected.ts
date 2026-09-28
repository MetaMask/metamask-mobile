/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Generated from the verified deployed Mobile analytics contract.
 */

export interface AnalyticsEventContext {
  readonly protocols: {
    readonly event_version: number;
  };
}

export interface AnalyticsEventTransport {
  track(
    eventName: string,
    properties: object,
    context: AnalyticsEventContext,
  ): void;
}

type ExactProperties<Expected, Actual extends Expected> = Actual &
  Record<Exclude<keyof Actual, keyof Expected>, never>;

interface EventVersion<Properties> {
  track<Actual extends Properties>(
    properties: ExactProperties<Properties, Actual>,
  ): void;
}

const createEventVersion = <Properties,>(
  transport: AnalyticsEventTransport,
  eventName: string,
  version: number,
): EventVersion<Properties> => ({
  track: (properties) => {
    transport.track(eventName, properties as object, {
      protocols: {
        event_version: version,
      },
    });
  },
});

const EVENT_NAME = 'Quick Buy Amount Selected';

export interface QuickBuyAmountSelectedV1Properties {
  /** How the user picked the amount. */
  readonly amount_selection_method: 'preset' | 'custom_input';
  /** Selected USD amount. */
  readonly amount_usd: number;
  /** CAIP-19 identifier of the token associated with the event. */
  readonly caip19?: string;
  /** Symbol of the source token currently selected to pay with (may be undefined before token resolution finishes). */
  readonly pay_with_token?: string;
  /** Preset chip value, when amount_selection_method is preset. */
  readonly preset_value?: 20 | 50 | 100 | 250;
  /** Surface from which the QuickBuy sheet was opened. */
  readonly source:
    | 'notification'
    | 'profile_position'
    | 'leaderboard'
    | 'asset_details'
    | 'market_insights'
    | 'security_trust'
    | 'explore_search'
    | 'explore_crypto'
    | 'explore_now'
    | 'explore_rwas'
    | 'explore_trending'
    | 'explore_stocks';
  /** Wallet address of the trader. May be absent on cold-start notification deeplinks where only a profile UUID is available. */
  readonly trader_address?: string;
}

export interface QuickBuyAmountSelectedV2Properties {
  /** How the user picked the amount. */
  readonly amount_selection_method: 'preset' | 'custom_input' | 'slider';
  /** Selected USD amount. */
  readonly amount_usd: number;
  /** CAIP-19 identifier of the spot token associated with the event, including chain ID. Sent for spot positions only; absent for perps. */
  readonly caip19?: string;
  /** Lowercase chain slug for the position. Spot examples: base, ethereum, solana. Perps: hyperliquid. Present on follow-trading token events when a position context is resolved. */
  readonly chain_name?: string;
  /** How the user reached the follow-trading token (trade) screen before opening Quick Buy. Only set when Quick Buy is opened from the trade screen. */
  readonly original_entry_point?:
    | 'leaderboard'
    | 'trader_profile'
    | 'notification'
    | 'deep_link'
    | 'home_carousel';
  /** Symbol of the source token currently selected to pay with (may be undefined before token resolution finishes). */
  readonly pay_with_token?: string;
  /** Tradable Hyperliquid perps market symbol. Sent for perp positions only; absent for spot. */
  readonly perps_market?: string;
  /** Preset chip value, when amount_selection_method is preset. */
  readonly preset_value?: 10 | 50 | 100 | 250;
  /** Slider position (0–100), when amount_selection_method is slider. */
  readonly slider_percent?: number;
  /** Surface from which the QuickBuy sheet was opened. */
  readonly source:
    | 'notification'
    | 'profile_position'
    | 'leaderboard'
    | 'trader_feed'
    | 'asset_details'
    | 'market_insights'
    | 'security_trust'
    | 'explore_search'
    | 'explore_crypto'
    | 'explore_now'
    | 'explore_rwas'
    | 'explore_trending'
    | 'explore_stocks';
  /** Wallet address of the trader. May be absent on cold-start notification deeplinks where only a profile UUID is available. */
  readonly trader_address?: string;
}

export const createQuickBuyAmountSelected = (
  transport: AnalyticsEventTransport,
) => ({
  v1: createEventVersion<QuickBuyAmountSelectedV1Properties>(
    transport,
    EVENT_NAME,
    1,
  ),
  v2: createEventVersion<QuickBuyAmountSelectedV2Properties>(
    transport,
    EVENT_NAME,
    2,
  ),
});
