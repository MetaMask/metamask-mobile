import type { CandlePeriod } from '@metamask/perps-controller';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';

export const PERPS_MARKET_DETAIL_SECTION = {
  MARKET: 'market',
  PRICE: 'price',
  CHART: 'chart',
  STATS: 'stats',
  INSIGHTS: 'insights',
  ACCOUNT: 'account',
  ORDER_BOOK: 'order_book',
  POSITIONS_ORDERS: 'positions_orders',
} as const;

export type PerpsMarketDetailSection =
  (typeof PERPS_MARKET_DETAIL_SECTION)[keyof typeof PERPS_MARKET_DETAIL_SECTION];

export type PerpsMarketDetailSectionState =
  | 'loading'
  | 'content'
  | 'empty'
  | 'error'
  | 'not_applicable';

export type PerpsMarketDetailSections = Partial<
  Record<PerpsMarketDetailSection, PerpsMarketDetailSectionState>
>;

export type PerpsMarketDetailGenerationTrigger =
  | 'initial'
  | 'background_resume'
  | 'market_switch'
  | 'mode_switch'
  | 'account_switch'
  | 'network_switch'
  | 'configuration_change';

export type PerpsMarketDetailMode = 'lite' | 'pro';

export interface DetailGenerationIdentity {
  address?: string;
  configuredChartLibrary: string;
  configurationKey: string;
  entrySource?: string;
  expectedSectionsKey: string;
  foregroundGeneration: number;
  hip3ConfigVersion: number;
  network: string;
  provider?: string;
  symbol: string;
}

export interface StreamDeliveryRevisions {
  account: number;
  candles: number;
  focusedPrice: number;
  orders: number;
  positions: number;
  prices: number;
}

/** The symbol+interval whose candle deliveries prove chart readiness. */
export interface SelectedCandleKey {
  symbol: string;
  interval: CandlePeriod;
}

/**
 * Evidence a generation must produce before retained UI state may be trusted.
 * Held by the active session and reused by the MarketDetailLive trace so both
 * report the same readiness.
 */
export interface DetailDeliveryEvidence {
  deliveryBaselines?: StreamDeliveryRevisions;
  connectionGenerationBaseline?: number;
  requiresConnectionGenerationAdvance: boolean;
  requiresCandleFreshness: boolean;
}

/** Sections the `PerpsMarketDetailLive` trace waits on. */
export const MARKET_DETAIL_LIVE_SECTIONS = [
  PERPS_MARKET_DETAIL_SECTION.MARKET,
  PERPS_MARKET_DETAIL_SECTION.PRICE,
  PERPS_MARKET_DETAIL_SECTION.STATS,
  PERPS_MARKET_DETAIL_SECTION.ACCOUNT,
] as const;

export function resolveGenerationTrigger(
  previous: DetailGenerationIdentity | null,
  current: DetailGenerationIdentity,
  surfaceTrigger: Extract<
    PerpsMarketDetailGenerationTrigger,
    'initial' | 'market_switch' | 'mode_switch'
  >,
  activeTrigger: PerpsMarketDetailGenerationTrigger,
): PerpsMarketDetailGenerationTrigger {
  if (!previous) return surfaceTrigger;
  if (previous.foregroundGeneration !== current.foregroundGeneration) {
    return 'background_resume';
  }
  if (previous.symbol !== current.symbol) return 'market_switch';
  if (previous.address !== current.address) return 'account_switch';
  if (
    previous.provider !== current.provider ||
    previous.network !== current.network ||
    previous.hip3ConfigVersion !== current.hip3ConfigVersion
  ) {
    return 'network_switch';
  }
  if (
    previous.configurationKey !== current.configurationKey ||
    previous.configuredChartLibrary !== current.configuredChartLibrary ||
    previous.entrySource !== current.entrySource ||
    previous.expectedSectionsKey !== current.expectedSectionsKey
  ) {
    return 'configuration_change';
  }
  return activeTrigger;
}

export const roundedOffsets = (
  offsets: Partial<Record<PerpsMarketDetailSection, number>>,
) =>
  Object.fromEntries(
    Object.entries(offsets).map(([section, offset]) => [
      section,
      Number(offset.toFixed(3)),
    ]),
  );

export const getStreamDeliveryRevisions = (
  selectedCandle?: SelectedCandleKey,
): StreamDeliveryRevisions => {
  const stream = getStreamManagerInstance();
  return {
    account: stream.account.getDeliveryRevision(),
    candles: stream.candles.getDeliveryRevision(
      selectedCandle?.symbol,
      selectedCandle?.interval,
    ),
    focusedPrice: stream.focusedPrice.getDeliveryRevision(),
    orders: stream.orders.getDeliveryRevision(),
    positions: stream.positions.getDeliveryRevision(),
    prices: stream.prices.getDeliveryRevision(),
  };
};

export function hasFreshSectionDelivery(
  section: PerpsMarketDetailSection,
  baseline: StreamDeliveryRevisions | undefined,
  connectionGenerationBaseline: number | undefined,
  requiresConnectionGenerationAdvance: boolean,
  requiresCandleFreshness: boolean,
  selectedCandle?: SelectedCandleKey,
): boolean {
  if (!baseline) return true;
  const current = getStreamDeliveryRevisions(selectedCandle);
  const generation = PerpsConnectionManager.getConnectionGeneration();
  const connectionFresh =
    connectionGenerationBaseline !== undefined &&
    (requiresConnectionGenerationAdvance
      ? generation > connectionGenerationBaseline
      : generation >= connectionGenerationBaseline);
  switch (section) {
    case PERPS_MARKET_DETAIL_SECTION.PRICE:
      return (
        connectionFresh &&
        (current.focusedPrice > baseline.focusedPrice ||
          current.prices > baseline.prices)
      );
    case PERPS_MARKET_DETAIL_SECTION.CHART:
      return (
        !requiresCandleFreshness ||
        (connectionFresh && current.candles > baseline.candles)
      );
    case PERPS_MARKET_DETAIL_SECTION.ACCOUNT:
      return connectionFresh && current.account > baseline.account;
    case PERPS_MARKET_DETAIL_SECTION.ORDER_BOOK:
      return true;
    case PERPS_MARKET_DETAIL_SECTION.POSITIONS_ORDERS:
      return (
        connectionFresh &&
        current.positions > baseline.positions &&
        current.orders > baseline.orders
      );
    default:
      return true;
  }
}

/**
 * Whether every `PerpsMarketDetailLive` section has produced generation-scoped
 * delivery evidence. Without a baseline (initial mount, market/mode switch,
 * configuration change) there is nothing retained to distrust, so this is true
 * and Live behaves exactly as before.
 */
export function hasFreshLiveDelivery(
  evidence: DetailDeliveryEvidence,
  selectedCandle?: SelectedCandleKey,
): boolean {
  if (!evidence.deliveryBaselines) return true;
  return MARKET_DETAIL_LIVE_SECTIONS.every((section) =>
    hasFreshSectionDelivery(
      section,
      evidence.deliveryBaselines,
      evidence.connectionGenerationBaseline,
      evidence.requiresConnectionGenerationAdvance,
      evidence.requiresCandleFreshness,
      selectedCandle,
    ),
  );
}
