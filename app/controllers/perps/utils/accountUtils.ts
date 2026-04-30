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

export type AddSpotBalanceOptions = {
  /**
   * Whether the user's abstraction mode folds spot balances into perps
   * collateral. Standard / DEX abstraction keep spot separate.
   */
  foldIntoCollateral?: boolean;
};

// The release-branch balance bridge is USDC-only. Non-USDC spot assets must
// not inflate the balances shown or validated by withdraw/payment flows.
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
  const currentAvailable = parseFloat(accountState.availableBalance);

  // Preserve sentinel totals (e.g. PERPS_CONSTANTS.FallbackDataDisplay '--')
  // rather than coercing them to NaN.
  if (!Number.isFinite(currentTotal)) {
    return accountState;
  }

  if (spotBalance === 0) {
    // For unified / portfolio-margin accounts the USDC may be represented as
    // perps equity rather than an explicit spot balance (e.g. a user who
    // migrated from Standard mode — HL keeps the collateral inside the perps
    // ledger and doesn't surface it via spotClearinghouseState until the next
    // settlement cycle). In this case withdraw3 draws from the unified balance
    // directly, so compute a conservative available amount from
    //   accountValue − initialMarginUsed
    // rather than returning $0. Standard-mode users are unaffected because
    // foldIntoCollateral is false for them and their withdrawable is already > 0.
    if (
      foldIntoCollateral &&
      Number.isFinite(currentAvailable) &&
      currentAvailable === 0 &&
      currentTotal > 0
    ) {
      const marginUsed = parseFloat(accountState.marginUsed);
      const freeEquity = Number.isFinite(marginUsed)
        ? Math.max(0, currentTotal - marginUsed)
        : currentTotal;
      if (freeEquity > 0) {
        return {
          ...accountState,
          availableToTradeBalance: freeEquity.toString(),
        };
      }
    }

    return {
      ...accountState,
      availableToTradeBalance: Number.isFinite(currentAvailable)
        ? currentAvailable.toString()
        : accountState.availableBalance,
    };
  }

  // Fail-open guard: a user with withdrawable=0 but free spot USDC is, by
  // HL's own contract, in unifiedAccount / portfolioMargin (Standard mode
  // keeps perps and spot independent, so Standard users always have a
  // non-zero perps withdrawable when they have collateral). Folding is the
  // only way to surface a non-zero balance, and withdraw3 will draw from
  // the unified ledger directly, so this matches the API's actual behaviour.
  // This catches the race where the abstraction-mode cache is stale
  // (e.g. subscriptionService fetched it before migration completed).
  const stuckOnPerpsOnly =
    !foldIntoCollateral &&
    Number.isFinite(currentAvailable) &&
    currentAvailable === 0 &&
    freeSpot > 0;
  const effectiveFold = foldIntoCollateral || stuckOnPerpsOnly;

  let availableToTrade = accountState.availableBalance;
  if (effectiveFold) {
    availableToTrade = Number.isFinite(currentAvailable)
      ? (currentAvailable + freeSpot).toString()
      : freeSpot.toString();
  }

  // Subtract spotHold to avoid double-counting on Unified/PM accounts:
  // marginSummary.accountValue already includes the margin that HL
  // surfaces via spot.hold. Standard mode has spotHold = 0, no-op.
  const nextTotal = currentTotal + spotBalance - spotHold;

  return {
    ...accountState,
    totalBalance: nextTotal.toString(),
    availableToTradeBalance: availableToTrade,
  };
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
    availableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
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
    const accAvailableToTrade = parseFloat(
      acc.availableToTradeBalance ?? acc.availableBalance,
    );
    const stateAvailableToTrade = parseFloat(
      state.availableToTradeBalance ?? state.availableBalance,
    );
    const availableToTradeSum =
      Number.isFinite(accAvailableToTrade) &&
      Number.isFinite(stateAvailableToTrade)
        ? (accAvailableToTrade + stateAvailableToTrade).toString()
        : undefined;

    return {
      availableBalance: (
        parseFloat(acc.availableBalance) + parseFloat(state.availableBalance)
      ).toString(),
      ...(availableToTradeSum !== undefined && {
        availableToTradeBalance: availableToTradeSum,
      }),
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
