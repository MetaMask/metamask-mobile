/**
 * Account utilities for Perps components
 * Handles account selection and EVM account filtering
 */
import { isEvmAccountType } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';

export function findEvmAccount(
  accounts: InternalAccount[],
): InternalAccount | null {
  const evmAccount = accounts.find(
    (account) => account && isEvmAccountType(account.type),
  );
  return evmAccount || null;
}

export function getEvmAccountFromAccountGroup(
  accounts: InternalAccount[],
): { address: string } | undefined {
  const evmAccount = findEvmAccount(accounts);
  return evmAccount ? { address: evmAccount.address } : undefined;
}

interface AccountTreeMessenger {
  call: (
    action: 'AccountTreeController:getAccountsFromSelectedAccountGroup',
  ) => InternalAccount[];
}

export function getSelectedEvmAccount(
  messenger: AccountTreeMessenger,
): { address: string } | undefined {
  const accounts = messenger.call(
    'AccountTreeController:getAccountsFromSelectedAccountGroup',
  );
  return getEvmAccountFromAccountGroup(accounts);
}

export interface ReturnOnEquityInput {
  unrealizedPnl: string | number;
  returnOnEquity: string | number;
}

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
  return weightedROE.toFixed(1);
}
