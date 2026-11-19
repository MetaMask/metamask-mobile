import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionType,
  type AddTransactionOptions,
  type TransactionMeta,
  type TransactionParams,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import type { PredictDepositTransferMode } from '../../config/depositEnvironment';
import type { PredictAmount, PredictHex } from '../../types';
import { encodeUsdcTransfer, toUsdcBaseUnits } from './usdcTransfer';

/** Clock-independent request identifier binding a wallet transaction to one deposit operation. */
export const depositTransferRequestId = (operationId: string): string =>
  `predict-deposit:${operationId}`;

/** One USDC transfer that pays a checked Funding Plan. */
export interface DepositTransfer {
  /** The backend deposit operation ID this transfer pays. */
  operationId: string;
  /** The Funding Wallet: the selected EVM account. */
  from: PredictHex;
  chainId: number;
  /** The plan's USDC contract. */
  tokenContract: PredictHex;
  /** The plan's deposit address. */
  recipient: PredictHex;
  /** USD, the plan's exact amount. */
  amount: PredictAmount;
}

/** What actually went out, read back once the wallet submitted it. The
 * caller checks it still pays the plan before reporting the hash. */
export interface SubmittedDepositTransfer {
  txHash: PredictHex;
  chainId: number;
  to: string | undefined;
  data: string | undefined;
}

/**
 * Sends the deposit transfer. One per build, chosen from the build's
 * environment only (`getPredictDepositEnvironment`): the wallet in
 * production, a simulation on the dev Predict API. A rejection or a failure
 * rejects the returned promise; it resolves only once a hash exists.
 */
export interface DepositTransferExecutor {
  readonly mode: PredictDepositTransferMode;
  send(transfer: DepositTransfer): Promise<SubmittedDepositTransfer>;
}

/**
 * The plain ERC-20 `transfer(depositAddress, amount)` on the plan's USDC
 * contract, with no native value. Never `TransactionType.predictDeposit`,
 * which the confirmation renders as pUSD on Polygon.
 */
export const buildDepositTransferParams = ({
  from,
  tokenContract,
  recipient,
  amount,
}: DepositTransfer): TransactionParams & { to: Hex; data: Hex } => ({
  from,
  to: tokenContract,
  data: encodeUsdcTransfer(recipient, amount),
  value: '0x0',
});

export interface WalletTransferExecutorDeps {
  /** `NetworkController.findNetworkClientIdByChainId`, which throws or
   * answers nothing for a chain the wallet does not have. */
  findNetworkClientId: (chainId: Hex) => string | undefined;
  addTransaction: (
    params: TransactionParams,
    options: AddTransactionOptions,
  ) => Promise<{ result: Promise<string>; transactionMeta: TransactionMeta }>;
  /** The latest state of a transaction, by ID. */
  getTransaction: (id: string) => TransactionMeta | undefined;
  /** Opens the standard confirmation for the transaction just added. */
  presentConfirmation: () => void;
}

const readChainId = (chainId: Hex | undefined, fallback: number): number => {
  const parsed =
    chainId === undefined ? Number.NaN : Number.parseInt(chainId, 16);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Sends the transfer from the user's wallet: `addTransaction` on the plan's
 * network, then the standard confirmation, which shows the amount, token,
 * network and recipient. Resolves with the hash once the wallet submits it,
 * and reads the transaction back so its call data can be checked.
 *
 * Gas: no gas fee token is forced. When Base supports gasless transfers for
 * the account (the EIP-7702 relay) and native ETH is short, the confirmation
 * selects a gas fee token itself.
 */
export const createWalletTransferExecutor = (
  deps: WalletTransferExecutorDeps,
): DepositTransferExecutor => ({
  mode: 'wallet',
  async send(transfer): Promise<SubmittedDepositTransfer> {
    const networkClientId = deps.findNetworkClientId(toHex(transfer.chainId));
    if (!networkClientId) {
      throw new Error('The deposit chain is not available in this wallet');
    }
    const { result, transactionMeta } = await deps.addTransaction(
      buildDepositTransferParams(transfer),
      {
        networkClientId,
        origin: ORIGIN_METAMASK,
        isInternal: true,
        type: TransactionType.tokenMethodTransfer,
        requestId: depositTransferRequestId(transfer.operationId),
      },
    );
    deps.presentConfirmation();
    const txHash = (await result) as PredictHex;
    const submitted =
      deps.getTransaction(transactionMeta.id) ?? transactionMeta;
    return {
      txHash,
      chainId: readChainId(submitted.chainId, transfer.chainId),
      to: submitted.txParams?.to,
      data: submitted.txParams?.data,
    };
  },
});

/** A random 32-byte transaction hash. */
export const randomTransferHash = (): PredictHex => {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')}`;
};

export interface SimulatedTransferExecutorDeps {
  log: (message: string, details: Record<string, unknown>) => void;
  /**
   * Makes the hash the simulation reports. The seam for Kalshi demo's
   * `testfailed` hash (`0x`, 54 hex characters, then `testfailed`), which
   * walks the settlement failure path. The transfer report validates hashes
   * as `0x` plus 64 hex today, so only the random hash gets through it.
   */
  makeHash?: () => PredictHex;
}

/**
 * The dev Predict API's executor. Logs the exact transfer the wallet
 * executor would send and answers a random 32-byte hash. It never touches
 * the wallet: no transaction is added, signed or broadcast.
 */
export const createSimulatedTransferExecutor = ({
  log,
  makeHash = randomTransferHash,
}: SimulatedTransferExecutorDeps): DepositTransferExecutor => ({
  mode: 'simulated',
  async send(transfer): Promise<SubmittedDepositTransfer> {
    const params = buildDepositTransferParams(transfer);
    log('PredictNext: simulated deposit transfer, nothing was sent', {
      chainId: transfer.chainId,
      from: params.from,
      to: params.to,
      data: params.data,
      recipient: transfer.recipient,
      amount: transfer.amount,
      baseUnits: toUsdcBaseUnits(transfer.amount)?.toString(),
    });
    return {
      txHash: makeHash(),
      chainId: transfer.chainId,
      to: params.to,
      data: params.data,
    };
  },
});
