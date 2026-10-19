/**
 * `@metamask/client-utils` is the source of truth for activity types (same as
 * extension). Remaining mobile-only fields are leftovers to delete as call sites move over.
 */
import type {
  ActivityItem as ClientUtilsActivityItem,
  ActivityKind,
  Fee as ActivityFee,
  PerpsOrderKind,
  TokenAmount as ClientUtilsTokenAmount,
} from '@metamask/client-utils';
import type { TriggerOrderType } from '@metamask/perps-controller';

export type {
  ActivityKind,
  PerpsOrderKind,
  Status,
  Fee as ActivityFee,
} from '@metamask/client-utils';

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
  | 'predictionClaimWinnings';

interface PredictDataExtras {
  eventTitle?: string;
  icon?: string;
}

type ActivityDataExtras<ActivityType> = ActivityType extends PredictActivityKind
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
  ? Kind extends Extract<ActivityType, ActivityKind>
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
