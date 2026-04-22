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

export function getAvailableToTradeSpotBalance(
  spotState?: SpotClearinghouseStateResponse | null,
): number {
  if (!spotState?.balances || !Array.isArray(spotState.balances)) {
    return 0;
  }

  return spotState.balances.reduce(
    (
      sum: number,
      balance: { coin?: string; total?: string; hold?: string | number },
    ) => {
      if (!balance.coin || !SPOT_COLLATERAL_COINS.has(balance.coin)) {
        return sum;
      }

      const total = parseFloat(balance.total ?? '0');
      const hold =
        typeof balance.hold === 'number'
          ? balance.hold
          : parseFloat(balance.hold ?? '0');

      if (!Number.isFinite(total)) {
        return sum;
      }

      const freeCollateral = Math.max(
        total - (Number.isFinite(hold) ? hold : 0),
        0,
      );
      return sum + freeCollateral;
    },
    0,
  );
}

export function addSpotBalanceToAccountState(
  accountState: AccountState,
  spotState?: SpotClearinghouseStateResponse | null,
): AccountState {
  const spotBalance = getSpotBalance(spotState);
  const availableToTradeSpotBalance = getAvailableToTradeSpotBalance(spotState);

  if (spotBalance === 0 && availableToTradeSpotBalance === 0) {
    return accountState;
  }

  const currentTotal = parseFloat(accountState.totalBalance);
  const currentAvailableToTrade = parseFloat(
    accountState.availableToTradeBalance ?? accountState.availableBalance,
  );

  const next: AccountState = { ...accountState };
  if (Number.isFinite(currentTotal)) {
    next.totalBalance = (currentTotal + spotBalance).toString();
  }
  if (
    availableToTradeSpotBalance !== 0 &&
    Number.isFinite(currentAvailableToTrade)
  ) {
    next.availableToTradeBalance = (
      currentAvailableToTrade + availableToTradeSpotBalance
    ).toString();
  }
  return next;
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
    availableToTradeBalance: PERPS_CONSTANTS.FallbackDataDisplay,
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
      availableBalance: (
        parseFloat(acc.availableBalance) + parseFloat(state.availableBalance)
      ).toString(),
      availableToTradeBalance: (
        parseFloat(acc.availableToTradeBalance ?? acc.availableBalance) +
        parseFloat(state.availableToTradeBalance ?? state.availableBalance)
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
