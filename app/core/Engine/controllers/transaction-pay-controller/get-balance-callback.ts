import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type GetBalanceRequest,
  type GetBalanceResponse,
} from '@metamask/transaction-pay-controller';
import BigNumber from 'bignumber.js';
import { selectPerpsAccountState } from '../../../../components/UI/Perps/selectors/perpsController';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux/ReduxService';
import {
  getUsableMoneyAccountRedeemableRaw,
  selectMoneyAccountRedeemable,
} from '../../../../core/redux/slices/moneyBalance';
import { RootState } from '../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';

/**
 * Synchronous balance override for max-amount source calculation. Runs inside
 * the TransactionPayController state-update block, so it must read all balances
 * synchronously from Redux / controller state (never React hooks or async).
 *
 * Returns the correct source balance for the flows whose max amount cannot be
 * derived from the pay-token wallet balance:
 * - Perps withdraw — HyperLiquid withdrawable balance.
 * - Predict withdraw — Polymarket balance.
 * - Money-account withdraw / MoneyAccount override — mUSD + vmUSD redeemable.
 *
 * Returns `undefined` for every other case so the controller falls back to the
 * built-in token balance.
 *
 * @param request - The balance request.
 * @param request.transaction - Metadata of the transaction being resolved.
 * @param request.transactionData - Pay-controller state for the transaction.
 * @returns The balance override, or `undefined` to use the built-in balance.
 */
export function getBalance({
  transaction,
  transactionData,
}: GetBalanceRequest): GetBalanceResponse | undefined {
  const decimals = transactionData.tokens[0]?.decimals;

  if (hasTransactionType(transaction, [TransactionType.perpsWithdraw])) {
    return getPerpsBalance(decimals);
  }

  if (hasTransactionType(transaction, [TransactionType.predictWithdraw])) {
    return getPredictBalance(transaction.txParams?.from, decimals);
  }

  if (
    hasTransactionType(transaction, [TransactionType.moneyAccountWithdraw]) ||
    transactionData.paymentOverride === PaymentOverride.MoneyAccount
  ) {
    return getMoneyAccountBalance();
  }

  return undefined;
}

/**
 * Resolve the money-account withdrawable (mUSD + vmUSD) balance synchronously
 * from the persisted redeemable raw amount, stashed into Redux on every
 * successful balance fetch by {@link useMoneyAccountBalance}.
 *
 * @param decimals - Decimals of the source token (mUSD).
 * @returns The balance override, or `undefined` when unavailable.
 */
function getMoneyAccountBalance(): GetBalanceResponse | undefined {
  const state = ReduxService.store.getState() as RootState;
  const redeemable = selectMoneyAccountRedeemable(state);
  const activeAddress = selectPrimaryMoneyAccount(state)?.address;

  const redeemableRaw = getUsableMoneyAccountRedeemableRaw(
    redeemable,
    activeAddress,
  );

  return toBalanceResponseFromRaw(redeemableRaw);
}

/**
 * Resolve the perps (HyperLiquid) withdrawable balance synchronously from
 * PerpsController state. Streamed live into controller state, so it is always
 * current when read.
 *
 * @param decimals - Decimals of the source token (USDC).
 * @returns The balance override, or `undefined` when unavailable.
 */
function getPerpsBalance(
  decimals: number | undefined,
): GetBalanceResponse | undefined {
  const state = ReduxService.store.getState() as RootState;
  const accountState = selectPerpsAccountState(state);
  return toBalanceResponse(accountState?.withdrawableBalance, decimals);
}

/**
 * Resolve the predict (Polymarket) balance synchronously from PredictController
 * state. The cached value is used even when its short TTL has expired — the
 * last known balance is a better max source than the pay-token wallet balance.
 *
 * @param address - Account address funding the withdraw.
 * @param decimals - Decimals of the source token (USDC).
 * @returns The balance override, or `undefined` when unavailable.
 */
function getPredictBalance(
  address: string | undefined,
  decimals: number | undefined,
): GetBalanceResponse | undefined {
  if (!address) {
    return undefined;
  }

  const cached = Engine.context.PredictController.state.balances[address];
  return toBalanceResponse(cached?.balance?.toString(), decimals);
}

/**
 * Build a {@link GetBalanceResponse} from a human-readable balance and the
 * source token decimals. The source token for a withdraw is the first required
 * token (`transactionData.tokens[0]`); its decimals convert the human balance
 * to the atomic amount the controller uses as the exact source amount.
 *
 * @param balanceHuman - Human-readable balance (already factoring decimals).
 * @param decimals - Decimals of the source token.
 * @returns The balance override, or `undefined` if the balance is not positive.
 */
function toBalanceResponse(
  balanceHuman: string | undefined,
  decimals: number | undefined,
): GetBalanceResponse | undefined {
  if (balanceHuman === undefined || decimals === undefined) {
    return undefined;
  }

  const human = new BigNumber(balanceHuman);

  if (!human.isFinite() || human.lte(0)) {
    return undefined;
  }

  return {
    balanceRaw: human
      .shiftedBy(decimals)
      .decimalPlaces(0, BigNumber.ROUND_DOWN)
      .toFixed(0),
  };
}

/**
 * Build a {@link GetBalanceResponse} from an atomic (raw) balance.
 *
 * @param balanceRaw - Atomic balance (not factoring decimals).
 * @returns The balance override, or `undefined` if the balance is not positive.
 */
function toBalanceResponseFromRaw(
  balanceRaw: string | undefined,
): GetBalanceResponse | undefined {
  if (balanceRaw === undefined) {
    return undefined;
  }

  const raw = new BigNumber(balanceRaw);

  if (!raw.isFinite() || raw.lte(0)) {
    return undefined;
  }

  return {
    balanceRaw: raw.decimalPlaces(0, BigNumber.ROUND_DOWN).toFixed(0),
  };
}
