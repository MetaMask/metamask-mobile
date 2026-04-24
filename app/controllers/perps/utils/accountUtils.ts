/**
 * Account utilities for Perps components
 * Handles account selection and EVM account filtering
 */
import type { InternalAccount } from '@metamask/keyring-internal-api';

import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { AccountState, PerpsInternalAccount } from '../types';
import type { SpotClearinghouseStateResponse } from '../types/hyperliquid-types';

const EVM_ACCOUNT_TYPES = new Set(['eip155:eoa', 'eip155:erc4337']);

function isEvmAccountType(type: string): boolean {
  return EVM_ACCOUNT_TYPES.has(type);
}

export function findEvmAccount(
  accounts: (InternalAccount | PerpsInternalAccount)[],
): { address: string; type: string } | null {
  const evmAccount = accounts.find(
    (account) =>
      account && isEvmAccountType(account.type as InternalAccount['type']),
  );
  return evmAccount ?? null;
}

export function getEvmAccountFromAccountGroup(
  accounts: (InternalAccount | PerpsInternalAccount)[],
): { address: string } | undefined {
  const evmAccount = findEvmAccount(accounts);
  return evmAccount ? { address: evmAccount.address } : undefined;
}

export function getSelectedEvmAccount(
  accounts: (InternalAccount | PerpsInternalAccount)[],
): { address: string } | undefined {
  return getEvmAccountFromAccountGroup(accounts);
}

export type ReturnOnEquityInput = {
  unrealizedPnl: string | number;
  returnOnEquity: string | number;
};

export function calculateWeightedReturnOnEquity(
  accounts: ReturnOnEquityInput[],
): string {
  if (accounts.length === 0) {
    return '0';
  }

  let totalWeightedROE = 0;
  let totalMarginUsed = 0;

  for (const account of accounts) {
    const unrealizedPnl =
      typeof account.unrealizedPnl === 'string'
        ? Number.parseFloat(account.unrealizedPnl)
        : account.unrealizedPnl;
    const returnOnEquity =
      typeof account.returnOnEquity === 'string'
        ? Number.parseFloat(account.returnOnEquity)
        : account.returnOnEquity;

    if (Number.isNaN(unrealizedPnl) || Number.isNaN(returnOnEquity)) {
      continue;
    }

    if (returnOnEquity === 0) {
      continue;
    }

    const marginUsed = (unrealizedPnl / returnOnEquity) * 100;

    if (Number.isNaN(marginUsed) || marginUsed <= 0) {
      continue;
    }

    const roeDecimal = returnOnEquity / 100;

    totalWeightedROE += roeDecimal * marginUsed;
    totalMarginUsed += marginUsed;
  }

  if (totalMarginUsed <= 0) {
    return '0';
  }

  const weightedROE = (totalWeightedROE / totalMarginUsed) * 100;
  return weightedROE.toString();
}

// Spot coins counted toward currently supported funded-state gating.
// Today the in-app HyperLiquid market surface is USDC-collateralized only,
// so USDH must not inflate the shared funded-state path that hides Add Funds.
// Non-stablecoin spot assets (HYPE, PURR, …) also remain excluded.
const SPOT_COLLATERAL_COINS = new Set<string>(['USDC']);

export function getSpotBalance(
  spotState?: SpotClearinghouseStateResponse | null,
): number {
  if (!spotState?.balances || !Array.isArray(spotState.balances)) {
    return 0;
  }

  return spotState.balances.reduce(
    (sum: number, balance: { coin?: string; total?: string }) => {
      if (!balance.coin || !SPOT_COLLATERAL_COINS.has(balance.coin)) {
        return sum;
      }
      const value = parseFloat(balance.total ?? '0');
      return Number.isFinite(value) ? sum + value : sum;
    },
    0,
  );
}

export function getSpotHold(
  spotState?: SpotClearinghouseStateResponse | null,
): number {
  if (!spotState?.balances || !Array.isArray(spotState.balances)) {
    return 0;
  }

  return spotState.balances.reduce(
    (sum: number, balance: { coin?: string; hold?: string }) => {
      if (!balance.coin || !SPOT_COLLATERAL_COINS.has(balance.coin)) {
        return sum;
      }
      const value = parseFloat(balance.hold ?? '0');
      return Number.isFinite(value) ? sum + value : sum;
    },
    0,
  );
}

/**
 * Options controlling how `addSpotBalanceToAccountState` folds spot balance
 * into the three-field AccountState contract.
 */
export type AddSpotBalanceOptions = {
  /**
   * When `true`, free spot USDC contributes to both `spendableBalance` and
   * `withdrawableBalance` in addition to `totalBalance` — appropriate for
   * venues where spot is automatically used as perps collateral (e.g.
   * HyperLiquid Unified/Portfolio mode, where `withdraw3` draws from the
   * unified ledger).
   *
   * When `false`, free spot contributes to `totalBalance` only; spendable
   * and withdrawable stay perps-only — appropriate for venues where spot
   * is a separate ledger the backend cannot auto-draw from (e.g. HL
   * Standard mode). The caller is responsible for translating
   * provider-specific state into this flag.
   *
   * Defaults to `true` for backward compatibility with call sites that
   * haven't yet been wired with provider-specific context.
   */
  foldIntoCollateral?: boolean;
};

/**
 * Add spot USDC to the AccountState contract. Caller decides whether the
 * spot balance counts as perps collateral via `options.foldIntoCollateral`
 * — the util stays provider-agnostic.
 *
 * @param accountState - Base AccountState produced by a provider adapter.
 * @param spotState - Raw spot clearinghouse response (HL-shaped); null or missing means no spot balance and the state is returned unchanged.
 * @param options - See {@link AddSpotBalanceOptions}.
 * @returns AccountState with spot folded into `totalBalance` always, and into spendable/withdrawable when `foldIntoCollateral` is true.
 */
export function addSpotBalanceToAccountState(
  accountState: AccountState,
  spotState?: SpotClearinghouseStateResponse | null,
  options?: AddSpotBalanceOptions,
): AccountState {
  const foldIntoCollateral = options?.foldIntoCollateral ?? true;

  const spotBalance = getSpotBalance(spotState);
  const spotHold = getSpotHold(spotState);
  const freeSpot = Math.max(0, spotBalance - spotHold);

  const currentTotal = parseFloat(accountState.totalBalance);
  const currentSpendable = parseFloat(accountState.spendableBalance);
  const currentWithdrawable = parseFloat(accountState.withdrawableBalance);

  // Preserve sentinel totals (e.g. PERPS_CONSTANTS.FallbackDataDisplay '--')
  // rather than coercing them to NaN.
  if (!Number.isFinite(currentTotal)) {
    return accountState;
  }

  if (spotBalance === 0) {
    return accountState;
  }

  const nextSpendable = resolveFoldedBalance(
    currentSpendable,
    accountState.spendableBalance,
    freeSpot,
    foldIntoCollateral,
  );
  const nextWithdrawable = resolveFoldedBalance(
    currentWithdrawable,
    accountState.withdrawableBalance,
    freeSpot,
    foldIntoCollateral,
  );

  // Total always reflects combined wealth: subtract spotHold to avoid
  // double-counting on Unified/PM accounts where marginSummary.accountValue
  // already includes the margin that HL surfaces via spot.hold. Standard
  // mode has spotHold = 0 by construction, so the subtraction is a no-op.
  const nextTotal = currentTotal + spotBalance - spotHold;

  return {
    ...accountState,
    totalBalance: nextTotal.toString(),
    spendableBalance: nextSpendable,
    withdrawableBalance: nextWithdrawable,
  };
}

function resolveFoldedBalance(
  currentNumeric: number,
  currentRaw: string,
  freeSpot: number,
  foldIntoCollateral: boolean,
): string {
  if (!foldIntoCollateral) {
    return currentRaw;
  }
  if (Number.isFinite(currentNumeric)) {
    return (currentNumeric + freeSpot).toString();
  }
  return freeSpot.toString();
}

/**
 * Aggregate multiple per-DEX AccountState objects into one by summing numeric fields.
 * ROE is recalculated as (totalUnrealizedPnl / totalMarginUsed) * 100.
 *
 * @param states - The array of per-DEX account states to aggregate.
 * @returns The combined account state with summed balances and recalculated ROE.
 */
export function aggregateAccountStates(states: AccountState[]): AccountState {
  const fallback: AccountState = {
    spendableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
    withdrawableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
    totalBalance: PERPS_CONSTANTS.FallbackDataDisplay,
    marginUsed: PERPS_CONSTANTS.FallbackDataDisplay,
    unrealizedPnl: PERPS_CONSTANTS.FallbackDataDisplay,
    returnOnEquity: PERPS_CONSTANTS.FallbackDataDisplay,
  };

  if (states.length === 0) {
    return fallback;
  }

  const aggregated = states.reduce<AccountState>((acc, state, index) => {
    if (index === 0) {
      return { ...state };
    }

    return {
      spendableBalance: (
        parseFloat(acc.spendableBalance) + parseFloat(state.spendableBalance)
      ).toString(),
      withdrawableBalance: (
        parseFloat(acc.withdrawableBalance) +
        parseFloat(state.withdrawableBalance)
      ).toString(),
      totalBalance: (
        parseFloat(acc.totalBalance) + parseFloat(state.totalBalance)
      ).toString(),
      marginUsed: (
        parseFloat(acc.marginUsed) + parseFloat(state.marginUsed)
      ).toString(),
      unrealizedPnl: (
        parseFloat(acc.unrealizedPnl) + parseFloat(state.unrealizedPnl)
      ).toString(),
      returnOnEquity: '0',
    };
  }, fallback);

  // Recalculate ROE across all DEXs
  const totalMarginUsed = parseFloat(aggregated.marginUsed);
  const totalUnrealizedPnl = parseFloat(aggregated.unrealizedPnl);
  if (totalMarginUsed > 0) {
    aggregated.returnOnEquity = (
      (totalUnrealizedPnl / totalMarginUsed) *
      100
    ).toString();
  } else {
    aggregated.returnOnEquity = '0';
  }

  return aggregated;
}
