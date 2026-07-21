/**
 * Vendored from metamask-extension shared/lib/activity/types.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 */
import type { Transaction } from '@metamask/keyring-api';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { CaipChainId } from '@metamask/utils';
import type { TransactionGroup } from './adapters/transaction-group';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PerpsTransaction } from '../../components/UI/Perps/types/transactionHistory';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { PredictActivity } from '../../components/UI/Predict/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { FiatOrder } from '../../reducers/fiatOrders/types';

export type Status = 'pending' | 'success' | 'failed' | 'cancelled';

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

export type ActivityKind =
  | 'receive'
  | 'sell'
  | 'buy'
  | 'deposit'
  | 'stake'
  | 'unstake'
  | 'swap'
  | 'swapIncomplete'
  | 'claim'
  | 'claimMusdBonus'
  | 'send'
  | 'wrap'
  | 'unwrap'
  | 'approveSpendingCap'
  | 'revokeSpendingCap'
  | 'increaseSpendingCap'
  | 'contractInteraction'
  | 'contractDeployment'
  | 'bridge'
  | 'convert'
  | 'nftBuy'
  | 'nftSell'
  | 'smartAccountUpgrade'
  | 'lendingDeposit'
  | 'lendingWithdrawal'
  | 'predictionsAddFunds'
  | 'predictionsWithdrawFunds'
  | 'predictionClaimWinnings'
  | 'predictionCashedOut'
  | 'predictionPlaced'
  | 'perpsAddFunds'
  | 'perpsWithdraw'
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
  | 'assetActivation'
  | 'assetDeactivation'
  | PerpsOrderKind
  | 'nftMint';

const PERPS_ORDER_KIND_SET: ReadonlySet<string> = new Set(PERPS_ORDER_KINDS);

/**
 * Whether a kind is a perps order row. Type guard so callers can narrow the
 * union — e.g. keeping the icon/details switches exhaustive after an early
 * return.
 */
export function isPerpsOrderKind(kind: ActivityKind): kind is PerpsOrderKind {
  return PERPS_ORDER_KIND_SET.has(kind);
}

export interface TokenAmount {
  amount?: string;
  decimals?: number;
  isUnlimitedApproval?: boolean;
  symbol?: string;
  // CAIP-19 asset id (from adapters)
  assetId?: string;
  direction: 'in' | 'out';
}

/**
 * A fee associated with a transaction (e.g. the base network/gas fee). `amount`
 * is in the smallest unit of `symbol`/`assetId` (typically the native token).
 * Mirrors metamask-extension `shared/lib/activity/types.ts#ActivityFee`.
 */
export interface ActivityFee {
  type: string;
  amount?: string;
  decimals?: number;
  symbol?: string;
  assetId?: string;
}

interface ActivityData<Type extends ActivityKind, Data> {
  type: Type;
  chainId: CaipChainId;
  status: Status;
  timestamp: number;
  hash?: string;
  isEarliestNonce?: boolean;
  /* Used by legacy details modals. Interim until redesigned details are implemented */
  raw?:
    | { type: 'apiEvmTransaction'; data: V1TransactionByHashResponse }
    | { type: 'keyringTransaction'; data: Transaction }
    | { type: 'localTransaction'; data: TransactionGroup }
    | { type: 'perpsTransaction'; data: PerpsTransaction }
    | { type: 'predictActivity'; data: PredictActivity }
    | { type: 'rampOrder'; data: FiatOrder };
  data: Data;
}

export type ActivityListItem =
  | ActivityData<
      'send' | 'receive',
      {
        from: string;
        to: string;
        token?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      | 'swap'
      | 'convert'
      | 'lendingDeposit'
      | 'lendingWithdrawal'
      | 'wrap'
      | 'unwrap',
      {
        sourceToken?: TokenAmount;
        destinationToken?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      'swapIncomplete',
      {
        sourceToken?: TokenAmount;
      }
    >
  | ActivityData<
      'bridge',
      {
        sourceToken?: TokenAmount;
        destinationToken?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      'buy' | 'claim' | 'deposit' | 'stake' | 'unstake',
      {
        from?: string;
        to?: string;
        token?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      'claimMusdBonus',
      {
        token?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      'approveSpendingCap' | 'revokeSpendingCap' | 'increaseSpendingCap',
      {
        token?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      'nftBuy' | 'nftMint' | 'nftSell',
      {
        from?: string;
        to?: string;
        token?: TokenAmount;
        paymentToken?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      'contractInteraction',
      {
        from: string;
        to: string;
        token?: TokenAmount;
        fees?: ActivityFee[];
        methodId?: string;
        transactionCategory?: string;
        transactionProtocol?: string;
        transactionType?: string;
      }
    >
  | ActivityData<
      'assetActivation' | 'assetDeactivation',
      {
        from?: string;
        to?: string;
        token?: TokenAmount;
        fees?: ActivityFee[];
      }
    >
  | ActivityData<
      | 'sell'
      | 'contractDeployment'
      | 'smartAccountUpgrade'
      | 'predictionsAddFunds'
      | 'predictionsWithdrawFunds'
      | 'predictionClaimWinnings'
      | 'predictionCashedOut'
      | 'predictionPlaced'
      | 'perpsAddFunds'
      | 'perpsWithdraw'
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
