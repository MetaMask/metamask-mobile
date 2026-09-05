import type { TransactionBatchResult } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../Engine';

export interface SubmitMoneyAccountVaultDepositRequest {
  moneyAccountAddress: Hex;
  transactionHash: Hex;
  vaultDisabled?: boolean;
}

export interface SubmitMoneyAccountVaultDepositResult {
  skipped?: true;
  transactionHash?: Hex;
}

export interface SubmitMoneyAccountVaultWithdrawRequest {
  amountInRaw: string;
  moneyAccountAddress: Hex;
  recipient: Hex;
  requestId: string;
}

interface MoneyAccountVaultController {
  submitMoneyAccountVaultDeposit: (
    request: SubmitMoneyAccountVaultDepositRequest,
  ) => Promise<SubmitMoneyAccountVaultDepositResult>;
  submitMoneyAccountVaultWithdraw: (
    request: SubmitMoneyAccountVaultWithdrawRequest,
  ) => Promise<TransactionBatchResult>;
}

function getMoneyAccountVaultController(): MoneyAccountVaultController {
  const controller = Engine.context.TransactionPayController as unknown as
    | MoneyAccountVaultController
    | undefined;
  if (
    !controller?.submitMoneyAccountVaultDeposit ||
    !controller.submitMoneyAccountVaultWithdraw
  ) {
    throw new Error(
      'Money Account vault actions require a newer TransactionPayController',
    );
  }
  return controller;
}

/**
 * Vault mUSD received by a Money Account in a completed Iron payout.
 *
 * This is intentionally independent of UI state so a future event listener or
 * any Money surface can invoke the same controller action.
 *
 * @param request - Completed Iron payout transaction details.
 * @returns Hash of the confirmed vault transaction, or `{ skipped: true }` when
 * vaulting is disabled.
 */
export async function submitMoneyAccountVaultDeposit(
  request: SubmitMoneyAccountVaultDepositRequest,
): Promise<SubmitMoneyAccountVaultDepositResult> {
  return await getMoneyAccountVaultController().submitMoneyAccountVaultDeposit(
    request,
  );
}

/**
 * Create a user-confirmed exact-out vmUSD withdrawal to an Iron address.
 *
 * Callers should open the standard Money confirmation surface before invoking
 * this action. The controller creates an approval request and never broadcasts
 * the atomic withdraw/transfer batch without user confirmation.
 *
 * Quote / Pix identifiers belong in RampsController / NeoBankService; this
 * wrapper only forwards the on-chain withdraw intent.
 *
 * @param request - On-chain withdraw intent.
 * @returns Pending transaction batch ID.
 */
export async function submitMoneyAccountVaultWithdraw(
  request: SubmitMoneyAccountVaultWithdrawRequest,
): Promise<TransactionBatchResult> {
  return await getMoneyAccountVaultController().submitMoneyAccountVaultWithdraw(
    request,
  );
}
