/**
 * `@metamask/client-utils` is the source of truth for activity types (same as
 * extension). Mobile-only extras in `MobileFields` and `MobileDataExtras` fill
 * gaps that have no extension equivalent yet (perps order type, predict title).
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
   * Set at display time only (not by any adapter).
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

interface MobileFields {
  isEarliestNonce?: boolean;
}

type SplitByKind<T> = T extends { type: infer K }
  ? K extends string
    ? Omit<T, 'type'> & { type: K }
    : never
  : never;

type WithMobileTokenAmount<T> = T extends ClientUtilsTokenAmount
  ? TokenAmount
  : T extends object
    ? { [P in keyof T]: WithMobileTokenAmount<T[P]> }
    : T;

interface MobileDataExtras {
  /** Semantic trigger type localized by the Activity presentation layer. */
  perpsTriggerOrderType?: TriggerOrderType;
  fees?: ActivityFee[];
  /** Predict market title (e.g. "Will ETH reach $10k?") — predict-only. */
  eventTitle?: string;
}

type WithMobileDataTokens<T> = T extends { data: infer D }
  ? Omit<T, 'data'> & { data: WithMobileTokenAmount<D> & MobileDataExtras }
  : T;

export type ActivityListItem = SplitByKind<
  WithMobileDataTokens<ClientUtilsActivityItem & MobileFields>
>;
