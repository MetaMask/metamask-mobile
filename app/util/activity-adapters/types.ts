/**
 * Activity types are centralized in `@metamask/client-utils` (same as extension).
 * This module re-exports those aliases and keeps a small mobile-only surface for
 * fields/kinds not shipped upstream yet.
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
import type { RampsOrder } from '@metamask/ramps-controller';
import type { TransactionGroup } from './adapters/transaction-group';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PerpsTransaction } from '../../components/UI/Perps/types/transactionHistory';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PredictActivity } from '../../components/UI/Predict/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { FiatOrder } from '../../reducers/fiatOrders/types';

export type {
  Status,
  FiatAmount,
  Fee as ActivityFee,
} from '@metamask/client-utils';

/**
 * client-utils TokenAmount plus mobile-only unlimited-approval flag until that
 * lands upstream / via the indexed API.
 */
export type TokenAmount = ClientUtilsTokenAmount & {
  isUnlimitedApproval?: boolean;
};

/**
 * Perps order-lifecycle kinds (market/limit/stop, long/short, open/close).
 * Kept local until client-utils ActivityKind covers the full set.
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

type MobileOnlyActivityKind =
  | 'stake'
  | 'unstake'
  | 'swapIncomplete'
  | PerpsOrderKind;

export type ActivityKind = ClientUtilsActivityKind | MobileOnlyActivityKind;

const perpsOrderKindSet: ReadonlySet<string> = new Set(PERPS_ORDER_KINDS);

export function isPerpsOrderKind(kind: ActivityKind): kind is PerpsOrderKind {
  return perpsOrderKindSet.has(kind);
}

type ActivityRaw =
  | { type: 'apiEvmTransaction'; data: V1TransactionByHashResponse }
  | { type: 'keyringTransaction'; data: Transaction }
  | { type: 'localTransaction'; data: TransactionGroup }
  | { type: 'perpsTransaction'; data: PerpsTransaction }
  | { type: 'predictActivity'; data: PredictActivity }
  | { type: 'rampOrder'; data: FiatOrder | RampsOrder };

type MobileFields = {
  isEarliestNonce?: boolean;
  /** Used by legacy details modals until redesigned details take over. */
  raw?: ActivityRaw;
};

type MobileActivityData<Type extends ActivityKind, Data> = {
  type: Type;
  chainId: CaipChainId;
  status: Status;
  timestamp: number;
  hash?: string;
  data: Data;
} & MobileFields;

/**
 * Kinds / shapes mobile still produces that are not in client-utils
 * `ActivityItem` yet (or need mobile-only `fees` / token extras).
 */
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

export type ActivityListItem =
  | (ClientUtilsActivityItem & MobileFields)
  | MobileOnlyActivityItem;
