import { isValidHexAddress } from '@metamask/utils';
import type { PredictDepositNetwork } from '../../config/depositEnvironment';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictFundingPlan,
} from '../../types';
import { isSameUsdAmount } from './usdcTransfer';

/** A plan must leave more than this before `planExpiresAt`: time to confirm
 * in the wallet and for the transfer to land. */
export const DEPOSIT_PLAN_MIN_REMAINING_MS = 2 * 60 * 1000;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Why a Funding Plan was refused. The first five are the plan check, the
 * last three the recipient check.
 *
 * - `no_plan`: the deposit does not ask for a wallet transfer.
 * - `amount`: the plan's amount is not exactly what the user typed.
 * - `chain`: the plan's chain is not the build's deposit chain.
 * - `token`: the plan's token is not the known USDC for that chain.
 * - `address`: the deposit address is not a valid EVM address.
 * - `expiry`: two minutes or less remain before `planExpiresAt`, or it
 * does not parse.
 * - `recipient_zero`: the deposit address is the zero address.
 * - `recipient_token`: the deposit address is the USDC contract itself.
 * - `recipient_own_account`: the deposit address is an account in the
 * user's wallet.
 */
export type DepositPlanMismatchReason =
  | 'no_plan'
  | 'amount'
  | 'chain'
  | 'token'
  | 'address'
  | 'expiry'
  | 'recipient_zero'
  | 'recipient_token'
  | 'recipient_own_account';

export interface DepositPlanExpectation {
  /** The USD amount the user typed and approved. */
  amount: PredictAmount;
  /** The build's deposit chain and its USDC (see `depositEnvironment`). */
  network: PredictDepositNetwork;
  /** Every account address in the user's wallet, any case. */
  walletAddresses: readonly string[];
  /** The clock now, in milliseconds. */
  now: number;
}

export type DepositPlanCheck =
  | { ok: true; plan: PredictFundingPlan }
  | { ok: false; reason: DepositPlanMismatchReason };

const sameAddress = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/**
 * Checks a deposit's Funding Plan against the user's own intent and the
 * build's constants, before any wallet call. Every field is compared with
 * what the app already knows, never with another field of the same answer:
 * the plan must pay exactly the typed amount of the known USDC on the
 * expected chain, to a valid address that is not the zero address, the
 * token contract or the user's own account, with more than two minutes to
 * spare.
 */
export const checkDepositPlan = (
  deposit: PredictDepositOperation,
  expected: DepositPlanExpectation,
): DepositPlanCheck => {
  const { next } = deposit;
  if (next?.kind !== 'wallet_transfer') {
    return { ok: false, reason: 'no_plan' };
  }
  const plan: PredictFundingPlan = {
    chainId: next.chainId,
    tokenContract: next.tokenContract,
    amount: next.amount,
    depositAddress: next.depositAddress,
    planExpiresAt: next.planExpiresAt,
  };
  if (!isSameUsdAmount(plan.amount, expected.amount)) {
    return { ok: false, reason: 'amount' };
  }
  if (plan.chainId !== expected.network.chainId) {
    return { ok: false, reason: 'chain' };
  }
  if (!sameAddress(plan.tokenContract, expected.network.usdc.address)) {
    return { ok: false, reason: 'token' };
  }
  if (!isValidHexAddress(plan.depositAddress)) {
    return { ok: false, reason: 'address' };
  }
  if (sameAddress(plan.depositAddress, ZERO_ADDRESS)) {
    return { ok: false, reason: 'recipient_zero' };
  }
  if (sameAddress(plan.depositAddress, expected.network.usdc.address)) {
    return { ok: false, reason: 'recipient_token' };
  }
  if (
    expected.walletAddresses.some((address) =>
      sameAddress(plan.depositAddress, address),
    )
  ) {
    return { ok: false, reason: 'recipient_own_account' };
  }
  const expiresAt = Date.parse(plan.planExpiresAt);
  if (
    Number.isNaN(expiresAt) ||
    expiresAt - expected.now <= DEPOSIT_PLAN_MIN_REMAINING_MS
  ) {
    return { ok: false, reason: 'expiry' };
  }
  return { ok: true, plan };
};
