/**
 * Vendored from metamask-extension shared/lib/activity/types.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 */
import type { Transaction } from '@metamask/keyring-api';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { CaipChainId } from '@metamask/utils';
import type { TransactionGroup } from './adapters/transaction-group';

export type Status = 'pending' | 'success' | 'failed' | 'cancelled';

export type ActivityKind =
  | 'receive'
  | 'sell'
  | 'buy'
  | 'deposit'
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
  | 'marketShort'
  | 'stopMarketCloseShort'
  | 'marketCloseShort'
  | 'nftMint';

export interface TokenAmount {
  amount?: string;
  decimals?: number;
  symbol?: string;
  // CAIP-19 asset id (from adapters)
  assetId?: string;
  direction: 'in' | 'out';
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
    | { type: 'localTransaction'; data: TransactionGroup };
  data: Data;
}

export type ActivityListItem =
  | ActivityData<
      'send' | 'receive',
      {
        from: string;
        to: string;
        token?: TokenAmount;
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
      }
    >
  | ActivityData<
      'buy' | 'claim' | 'deposit',
      {
        from?: string;
        to?: string;
        token?: TokenAmount;
      }
    >
  | ActivityData<
      'claimMusdBonus',
      {
        token?: TokenAmount;
      }
    >
  | ActivityData<
      'approveSpendingCap' | 'revokeSpendingCap' | 'increaseSpendingCap',
      {
        token?: TokenAmount;
      }
    >
  | ActivityData<
      'nftMint',
      {
        from: string;
        to: string;
        token?: TokenAmount;
      }
    >
  | ActivityData<
      'contractInteraction',
      {
        from: string;
        to: string;
        token?: TokenAmount;
        methodId?: string;
        transactionCategory?: string;
        transactionProtocol?: string;
        transactionType?: string;
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
      | 'marketShort'
      | 'stopMarketCloseShort'
      | 'marketCloseShort',
      {
        from?: string;
        to?: string;
        token?: TokenAmount;
        sourceToken?: TokenAmount;
        destinationToken?: TokenAmount;
      }
    >;
