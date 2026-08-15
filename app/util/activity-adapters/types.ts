/**
 * `@metamask/client-utils` is the source of truth for activity types (same as
 * extension). Remaining mobile-only fields are leftovers to delete as call sites move over.
 */
import type {
  ActivityItem as ClientUtilsActivityItem,
  ActivityKind as ClientUtilsActivityKind,
  Fee as ActivityFee,
  Status,
  TokenAmount as ClientUtilsTokenAmount,
} from '@metamask/client-utils';
import type { Transaction } from '@metamask/keyring-api';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { CaipChainId } from '@metamask/utils';
import type { TransactionGroup } from './adapters/transaction-group';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PerpsTransaction } from '../../components/UI/Perps/types/transactionHistory';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PredictActivity } from '../../components/UI/Predict/types';
import type { RampsOrder } from '@metamask/ramps-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { FiatOrder } from '../../reducers/fiatOrders/types';

export type {
  Status,
  FiatAmount,
  Fee as ActivityFee,
} from '@metamask/client-utils';

export type TokenAmount = ClientUtilsTokenAmount & {
  isUnlimitedApproval?: boolean;
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
] as const;

export type PerpsOrderKind = (typeof PERPS_ORDER_KINDS)[number];

/** @deprecated Interim all callsites are migrated to use client-utils */
type MobileOnlyActivityKind =
  | 'stake'
  | 'unstake'
  | 'swapIncomplete'
  | PerpsOrderKind;

export type ActivityKind = ClientUtilsActivityKind | MobileOnlyActivityKind;

const PERPS_ORDER_KIND_SET: ReadonlySet<string> = new Set(PERPS_ORDER_KINDS);

/**
 * Whether a kind is a perps order row. Type guard so callers can narrow the
 * union — e.g. keeping the icon/details switches exhaustive after an early
 * return.
 */
export function isPerpsOrderKind(kind: ActivityKind): kind is PerpsOrderKind {
  return PERPS_ORDER_KIND_SET.has(kind);
}

type ActivityRaw =
  | { type: 'apiEvmTransaction'; data: V1TransactionByHashResponse }
  | { type: 'keyringTransaction'; data: Transaction }
  | { type: 'localTransaction'; data: TransactionGroup }
  | { type: 'perpsTransaction'; data: PerpsTransaction }
  | { type: 'predictActivity'; data: PredictActivity }
  | { type: 'rampOrder'; data: FiatOrder | RampsOrder };

interface MobileFields {
  isEarliestNonce?: boolean;
  /** @deprecated Get raw transaction data directly as needed */
  raw?: ActivityRaw;
}

type MobileActivityData<Type extends ActivityKind, Data> = {
  type: Type;
  chainId: CaipChainId;
  status: Status;
  timestamp: number;
  hash?: string;
  data: Data;
} & MobileFields;

/** @deprecated Interim all callsites are migrated to use client-utils */
type MobileOnlyActivityItem =
  | MobileActivityData<
      'stake' | 'unstake',
      {
        from?: string;
        to?: string;
        token?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | MobileActivityData<
      'swapIncomplete',
      {
        sourceToken?: TokenAmount;
      }
    >
  | MobileActivityData<
      | 'sell'
      | 'contractDeployment'
      | 'smartAccountUpgrade'
      | 'predictionsAddFunds'
      | 'predictionsWithdrawFunds'
      | 'predictionClaimWinnings'
      | 'predictionCashedOut'
      | 'predictionPlaced'
      | 'perpsOpenLong'
      | 'perpsCloseLong'
      | 'perpsCloseLongLiquidated'
      | 'perpsCloseLongStopLoss'
      | 'perpsOpenShort'
      | 'perpsCloseShort'
      | 'perpsCloseShortLiquidated'
      | 'perpsCloseShortStopLoss'
      | 'perpsPaidFundingFees'
      | 'perpsReceivedFundingFees'
      | 'perpsCloseShortTakeProfit'
      | 'perpsCloseLongTakeProfit'
      | PerpsOrderKind,
      {
        from?: string;
        to?: string;
        token?: TokenAmount;
        sourceToken?: TokenAmount;
        destinationToken?: TokenAmount;
        fees?: ActivityFee[];
      }
    >;

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
  fees?: ActivityFee[];
  transactionType?: string;
}

type WithMobileDataTokens<T> = T extends { data: infer D }
  ? Omit<T, 'data'> & { data: WithMobileTokenAmount<D> & MobileDataExtras }
  : T;

export type ActivityListItem = SplitByKind<
  WithMobileDataTokens<
    (ClientUtilsActivityItem & MobileFields) | MobileOnlyActivityItem
  >
>;
