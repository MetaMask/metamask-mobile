import type { PredictDepositNetwork } from '../../config/depositEnvironment';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictDepositParams,
  PredictDepositTransferParams,
  PredictFundingPlan,
  PredictHex,
} from '../../types';
import {
  checkDepositPlan,
  type DepositPlanMismatchReason,
} from './checkDepositPlan';
import type {
  DepositTransferExecutor,
  SubmittedDepositTransfer,
} from './depositTransferExecutor';
import { decodeUsdcTransfer, toUsdcBaseUnits } from './usdcTransfer';

/**
 * The deposit routes, already bound to one Venue. `prepareDeposit` carries
 * the user's approval: the caller binds it to the press that approved the
 * deposit.
 */
export interface DepositFunding {
  prepareDeposit: (
    params: PredictDepositParams,
  ) => Promise<PredictDepositOperation>;
  getDeposit: (operationId: string) => Promise<PredictDepositOperation>;
  listOpenDeposits: () => Promise<PredictDepositOperation[]>;
  reportDepositTransfer: (
    operationId: string,
    params: PredictDepositTransferParams,
  ) => Promise<PredictDepositOperation>;
  cancelDeposit: (operationId: string) => Promise<PredictDepositOperation>;
}

export interface DepositWorkflowDeps {
  funding: DepositFunding;
  executor: DepositTransferExecutor;
  /** The build's deposit chain and USDC. */
  network: PredictDepositNetwork;
  /** The Funding Wallet's address. */
  from: PredictHex;
  /** Every account address in the user's wallet. */
  walletAddresses: readonly string[];
  now: () => number;
  wait: (ms: number) => Promise<void>;
  /** How often, and how many times, to read a deposit again while the venue
   * prepares its address. */
  addressPoll: { intervalMs: number; attempts: number };
  /** Whether the wallet's error means the user rejected the transfer. */
  isUserRejection: (error: unknown) => boolean;
  logError: (error: unknown, message: string) => void;
}

/**
 * How one run ended.
 *
 * - `submitted`: the transfer went out. `reported` is false when the hash
 * report failed in transit: the funds moved, so the deposit is left open
 * for the backend and the resume path to settle, never cancelled.
 * - `in_progress`: another deposit is open (or this one is still waiting
 * for its address). `deposit` is it, when it could be read.
 * - `plan_mismatch`: the Funding Plan was refused before any wallet call,
 * and the deposit cancelled.
 * - `rejected`: the user rejected the transfer; the deposit was cancelled.
 * - `failed`: `stage` says where. Nothing moved, with two exceptions that
 * carry `DEPOSIT_TRANSFER_MISMATCH`: at `transfer`, the wallet submitted
 * something that no longer pays the plan (never reported; the deposit is
 * cancelled), and at `report`, the backend refused a transfer that did go
 * out.
 */
export type DepositOutcome =
  | { kind: 'submitted'; deposit: PredictDepositOperation; reported: boolean }
  | { kind: 'in_progress'; deposit: PredictDepositOperation | null }
  | { kind: 'plan_mismatch'; reason: DepositPlanMismatchReason }
  | { kind: 'rejected' }
  | {
      kind: 'failed';
      stage: 'prepare' | 'transfer' | 'report';
      error: PredictError;
    };

/** The deposit routes refuse these for good: a retry needs a new Client
 * Operation ID. */
const DEFINITIVE_PREPARE_ERRORS: readonly PredictErrorCode[] = [
  PredictErrorCode.DEPOSIT_FAILED,
  PredictErrorCode.DEPOSIT_MISMATCH,
  PredictErrorCode.DEPOSIT_AMOUNT_REJECTED,
];

/**
 * Whether the next attempt at the same amount may reuse the Client
 * Operation ID. Only a prepare call that failed without a definitive answer
 * may: the backend answers a repeated ID with the deposit it may already
 * have created, so a lost answer never creates a second deposit. Every
 * other outcome either created and closed a deposit or was refused, and the
 * next attempt is a new deposit.
 */
export const canReuseClientOperationId = (outcome: DepositOutcome): boolean =>
  outcome.kind === 'failed' &&
  outcome.stage === 'prepare' &&
  !DEFINITIVE_PREPARE_ERRORS.includes(outcome.error.code);

const toPredictError = (error: unknown): PredictError =>
  error instanceof PredictError
    ? error
    : PredictError.from(PredictErrorCode.UNKNOWN);

const hasPlan = (deposit: PredictDepositOperation): boolean =>
  deposit.next?.kind === 'wallet_transfer';

const isRequestingAddress = (deposit: PredictDepositOperation): boolean =>
  deposit.next?.kind === 'wait' && deposit.depositAddress === null;

/** Whether what the wallet submitted still pays exactly the plan. */
const paysPlan = (
  submitted: SubmittedDepositTransfer,
  plan: PredictFundingPlan,
): boolean => {
  const decoded = decodeUsdcTransfer(submitted.data);
  const planBaseUnits = toUsdcBaseUnits(plan.amount);
  return (
    decoded !== undefined &&
    planBaseUnits !== undefined &&
    submitted.chainId === plan.chainId &&
    submitted.to?.toLowerCase() === plan.tokenContract.toLowerCase() &&
    decoded.recipient === plan.depositAddress.toLowerCase() &&
    decoded.baseUnits === planBaseUnits
  );
};

/** Cancels a deposit the app will not pay. Best effort: an open deposit
 * left behind blocks only the next one, which then offers Cancel. */
const cancelQuietly = async (
  deps: DepositWorkflowDeps,
  deposit: PredictDepositOperation,
): Promise<void> => {
  try {
    await deps.funding.cancelDeposit(deposit.operationId);
  } catch (error) {
    deps.logError(error, 'PredictNext: failed to cancel an unpaid deposit');
  }
};

/** Reads a deposit again while the venue prepares its address. */
const awaitFundingPlan = async (
  deps: DepositWorkflowDeps,
  deposit: PredictDepositOperation,
): Promise<PredictDepositOperation> => {
  let current = deposit;
  for (
    let attempt = 0;
    attempt < deps.addressPoll.attempts && isRequestingAddress(current);
    attempt += 1
  ) {
    await deps.wait(deps.addressPoll.intervalMs);
    try {
      current = await deps.funding.getDeposit(current.operationId);
    } catch (error) {
      deps.logError(error, 'PredictNext: failed to read a new deposit');
      return current;
    }
  }
  return current;
};

/**
 * Pays an open deposit's Funding Plan: checks the plan against the amount
 * the user approved and the build's constants, sends the transfer, checks
 * the submitted call data still pays the plan, and reports the hash. A
 * refused plan, a rejection or a failed transfer cancels the deposit.
 */
export const payDeposit = async (
  deps: DepositWorkflowDeps,
  deposit: PredictDepositOperation,
  approvedAmount: PredictAmount,
): Promise<DepositOutcome> => {
  const check = checkDepositPlan(deposit, {
    amount: approvedAmount,
    network: deps.network,
    walletAddresses: deps.walletAddresses,
    now: deps.now(),
  });
  if (!check.ok) {
    await cancelQuietly(deps, deposit);
    return { kind: 'plan_mismatch', reason: check.reason };
  }
  const { plan } = check;

  let submitted: SubmittedDepositTransfer;
  try {
    submitted = await deps.executor.send({
      from: deps.from,
      chainId: plan.chainId,
      tokenContract: plan.tokenContract,
      recipient: plan.depositAddress,
      amount: plan.amount,
    });
  } catch (error) {
    await cancelQuietly(deps, deposit);
    if (deps.isUserRejection(error)) {
      return { kind: 'rejected' };
    }
    deps.logError(error, 'PredictNext: the deposit transfer failed');
    return {
      kind: 'failed',
      stage: 'transfer',
      error: PredictError.from(PredictErrorCode.DEPOSIT_FAILED),
    };
  }

  if (!paysPlan(submitted, plan)) {
    // Never report a transfer that pays anything but the plan.
    deps.logError(
      new Error('Submitted transfer does not pay the Funding Plan'),
      'PredictNext: refused to report a deposit transfer',
    );
    await cancelQuietly(deps, deposit);
    return {
      kind: 'failed',
      stage: 'transfer',
      error: PredictError.from(PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH),
    };
  }

  try {
    const reported = await deps.funding.reportDepositTransfer(
      deposit.operationId,
      { txHash: submitted.txHash, chainId: plan.chainId },
    );
    return { kind: 'submitted', deposit: reported, reported: true };
  } catch (error) {
    if (
      error instanceof PredictError &&
      error.code === PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH
    ) {
      return { kind: 'failed', stage: 'report', error };
    }
    // The funds moved. The deposit stays open for the backend, and for the
    // resume path that matches the wallet's transfer to it (PRED-1189).
    deps.logError(error, 'PredictNext: failed to report a deposit transfer');
    return { kind: 'submitted', deposit, reported: false };
  }
};

/** The open deposit to show: the one the refusal named, or the oldest. */
const readOpenDeposit = async (
  deps: DepositWorkflowDeps,
  operationId?: string,
): Promise<PredictDepositOperation | null> => {
  try {
    const open = await deps.funding.listOpenDeposits();
    if (operationId !== undefined) {
      const blocked = open.find(
        (deposit) => deposit.operationId === operationId,
      );
      if (blocked) {
        return blocked;
      }
    }
    return open[0] ?? null;
  } catch (error) {
    deps.logError(error, 'PredictNext: failed to read open deposits');
    return null;
  }
};

/**
 * Starts a deposit for the amount the user approved and pays it. Another
 * open deposit answers `in_progress` with that deposit, read from the open
 * list, so the caller can show it instead.
 */
export const startDeposit = async (
  deps: DepositWorkflowDeps,
  params: PredictDepositParams,
): Promise<DepositOutcome> => {
  let deposit: PredictDepositOperation;
  try {
    deposit = await deps.funding.prepareDeposit(params);
  } catch (error) {
    if (
      error instanceof PredictError &&
      error.code === PredictErrorCode.DEPOSIT_IN_PROGRESS
    ) {
      const operationId = error.metadata?.depositOperationId;
      return {
        kind: 'in_progress',
        deposit: await readOpenDeposit(
          deps,
          typeof operationId === 'string' ? operationId : undefined,
        ),
      };
    }
    return { kind: 'failed', stage: 'prepare', error: toPredictError(error) };
  }

  deposit = await awaitFundingPlan(deps, deposit);
  if (!hasPlan(deposit)) {
    if (deposit.next === null) {
      return {
        kind: 'failed',
        stage: 'prepare',
        error: PredictError.from(PredictErrorCode.DEPOSIT_FAILED),
      };
    }
    // Still waiting for its address, or already past the transfer step.
    return { kind: 'in_progress', deposit };
  }
  return payDeposit(deps, deposit, params.amount);
};
