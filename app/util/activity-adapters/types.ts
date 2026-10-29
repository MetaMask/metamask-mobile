/**
 * `@metamask/client-utils` is the source of truth for activity types (same as
 * extension). Remaining mobile-only fields are leftovers to delete as call sites move over.
 */
import type {
  ActivityItem as ClientUtilsActivityItem,
  ActivityKind as ClientUtilsActivityKind,
  Fee as ActivityFee,
  PerpsOrderKind,
  TokenAmount as ClientUtilsTokenAmount,
} from '@metamask/client-utils';
import type { TriggerOrderType } from '@metamask/perps-controller';
import type { CaipChainId } from '@metamask/utils';

export type {
  PerpsOrderKind,
  Status,
  Fee as ActivityFee,
} from '@metamask/client-utils';

/*
 * Local kinds (PRED-1405): kinds mobile renders before `@metamask/client-utils`
 * ships them. Each maps to the client-utils kind whose item shape it reuses.
 * When a client-utils bump adds a kind, delete its entry here.
 */
interface LocalActivityKindShapes {
  predictionSettled: 'predictionClaimWinnings';
}

type LocalActivityKind = keyof LocalActivityKindShapes;

export type ActivityKind = ClientUtilsActivityKind | LocalActivityKind;

/** The client-utils kind whose item shape `Kind` uses. */
type ShapeKindOf<Kind extends ActivityKind> = Kind extends LocalActivityKind
  ? LocalActivityKindShapes[Kind]
  : Kind;

export type TokenAmount = ClientUtilsTokenAmount & {
  /**
   * Keyring (non-EVM) amounts are already human-readable. Display/fiat must
   * not run `formatUnits` on them even when token metadata supplies decimals.
   */
  amountIsHumanReadable?: boolean;
};

/**
 * Perps order-lifecycle kinds (market/limit/stop, long/short, open/close).
 * The single source the `ActivityKind` union, the Perps "Order" sub-filter, and
 * the icon/details dispatch all derive from, so a new kind is wired in once.
 */
export const PERPS_ORDER_KINDS = [
  'marketShort',
  'stopMarketCloseShort',
  'marketCloseShort',
  'limitShort',
  'limitCloseShort',
  'marketLong',
  'stopMarketCloseLong',
  'marketCloseLong',
  'limitLong',
  'limitCloseLong',
] as const satisfies readonly PerpsOrderKind[];

const PERPS_ORDER_KIND_SET: ReadonlySet<string> = new Set(PERPS_ORDER_KINDS);

/**
 * Whether a kind is a perps order row. Type guard so callers can narrow the
 * union — e.g. keeping the icon/details switches exhaustive after an early
 * return.
 */
export function isPerpsOrderKind(kind: ActivityKind): kind is PerpsOrderKind {
  return PERPS_ORDER_KIND_SET.has(kind);
}

type WithMobileTokenAmount<T> = T extends ClientUtilsTokenAmount
  ? TokenAmount
  : T extends object
    ? { [P in keyof T]: WithMobileTokenAmount<T[P]> }
    : T;

type PredictActivityKind =
  | 'predictionPlaced'
  | 'predictionCashedOut'
  | 'predictionClaimWinnings'
  | 'predictionSettled';

interface PredictDataExtras {
  eventTitle?: string;
  icon?: string;
}

/**
 * Venue-scoped CAIP-2 `chainId` for Kalshi Predict rows. Kalshi has no chain,
 * so this is never Polygon or any real chain: it only keys the details source.
 * The row hides the network badge for `prediction*` kinds and the details
 * screen fetches a transaction only for `eip155:` chains.
 */
export const KALSHI_VENUE_CHAIN_ID: CaipChainId = 'kalshi:mainnet';

/**
 * Settlement details, carried on the item so the details screen renders
 * without a lookup. Amounts are plain decimal strings: shared activity code
 * must not import PredictNext types (ADR-0020). Proceeds are `data.token`.
 */
export interface PredictSettlementExtras {
  outcomeLabel?: string;
  marketQuestion?: string;
  /** Side the Predict User held. */
  side: 'yes' | 'no';
  /** The Market's result. `scalar` is a non-binary payout per share. */
  result: 'yes' | 'no' | 'scalar';
  shares: string;
  /** Signed. Absent when the backend cannot establish the cost basis. */
  realizedPnl?: string;
}

type ActivityDataExtras<ActivityType> = ActivityType extends 'predictionSettled'
  ? PredictSettlementExtras & PredictDataExtras & ActivityDataExtrasCommon
  : ActivityType extends PredictActivityKind
    ? PredictDataExtras & ActivityDataExtrasCommon
    : ActivityDataExtrasCommon;

interface ActivityDataExtrasCommon {
  fees?: ActivityFee[];
  perpsTriggerOrderType?: TriggerOrderType;
}

type ActivityItemForKind<T, Kind extends ActivityKind> = T extends {
  type: infer ActivityType;
  data: infer D;
}
  ? ShapeKindOf<Kind> extends Extract<ActivityType, ClientUtilsActivityKind>
    ? Omit<T, 'type' | 'data'> & {
        type: Kind;
        data: WithMobileTokenAmount<D> & ActivityDataExtras<Kind>;
      }
    : never
  : never;

type SplitByKind<T> = {
  [Kind in ActivityKind]: ActivityItemForKind<T, Kind>;
}[ActivityKind];

type WithMobileFields<T> = T extends unknown
  ? T & { isEarliestNonce?: boolean }
  : never;

export type ActivityListItem = WithMobileFields<
  SplitByKind<ClientUtilsActivityItem>
>;
