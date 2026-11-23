import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import addressRequestLost from '../../contracts/v1/fixtures/funding-contract/address-request-lost.json';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictHex,
} from '../../types';
import { depositTransferRequestId } from './depositTransferExecutor';
import { encodeUsdcTransfer } from './usdcTransfer';

export const DEFAULT_DEPOSIT_SENDER: PredictHex =
  '0x1111111111111111111111111111111111111111';
export const DEFAULT_DEPOSIT_TX_HASH: PredictHex = `0x${'ab'.repeat(32)}`;

export interface DepositTransferTxSource {
  operationId: string;
  chainId: number;
  tokenContract: string;
  depositAddress: string | null;
  amount: string;
  createdAt: string;
}

/**
 * Builds a failed deposit operation from the contract's `address-request-lost`
 * fixture so tests share one canonical failed deposit shape.
 */
export const makeFailedDeposit = (
  overrides: Partial<PredictDepositOperation> = {},
): PredictDepositOperation => ({
  ...(addressRequestLost as PredictDepositOperation),
  ...overrides,
});

/**
 * Builds a wallet `TransactionMeta` matching a Predict deposit's Funding Plan
 * so unit and integration suites share the resume matcher's transfer shape.
 */
export const makeDepositTransferTx = (
  deposit: DepositTransferTxSource,
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta => {
  if (!deposit.depositAddress) {
    throw new Error(
      'makeDepositTransferTx requires a deposit with a depositAddress.',
    );
  }
  const createdAtMs = Date.parse(deposit.createdAt);
  const data = encodeUsdcTransfer(
    deposit.depositAddress,
    deposit.amount as PredictAmount,
  );
  return {
    id: 'tx-1',
    chainId: `0x${deposit.chainId.toString(16)}`,
    networkClientId: deposit.chainId === 8453 ? 'base-mainnet' : 'base-sepolia',
    status: TransactionStatus.submitted,
    time: createdAtMs + 1000,
    type: TransactionType.tokenMethodTransfer,
    hash: DEFAULT_DEPOSIT_TX_HASH,
    requestId: depositTransferRequestId(deposit.operationId),
    txParams: {
      from: DEFAULT_DEPOSIT_SENDER,
      to: deposit.tokenContract,
      data,
      value: '0x0',
    },
    ...overrides,
  };
};

/** Drains pending Promise microtasks after advancing fake timers. */
export const flushMicrotasks = async (ticks = 10): Promise<void> => {
  for (let index = 0; index < ticks; index += 1) {
    await Promise.resolve();
  }
};
