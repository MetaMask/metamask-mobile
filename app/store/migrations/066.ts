import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';
import {
  BtcAccountType,
  BtcScope,
  EthAccountType,
  EthScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import { captureException } from '@sentry/react-native';

// Helper to check if a scope is a valid enum value
function isValidScope(scope: string): boolean {
  return (
    Object.values(EthScope).includes(scope as EthScope) ||
    Object.values(BtcScope).includes(scope as BtcScope) ||
    Object.values(SolScope).includes(scope as SolScope)
  );
}

function getScopesForAccountType(
  accountType: string,
  migrationNumber: number,
): string[] {
  switch (accountType) {
    case EthAccountType.Eoa:
    case EthAccountType.Erc4337:
      return [EthScope.Eoa];
    case BtcAccountType.P2wpkh:
      // Default to mainnet scope if address is missing or invalid
      return [BtcScope.Mainnet];
    case SolAccountType.DataAccount:
      return [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet];
    default:
      // Default to EVM namespace for unknown account types
      captureException(
        new Error(
          `Migration ${migrationNumber}: Unknown account type ${accountType}, defaulting to EVM EOA`,
        ),
      );
      return [EthScope.Eoa];
  }
}

/**
 * Migration for adding scopes to accounts in the AccountsController.
 * Each account type gets its appropriate scopes:
 * - EVM EOA: [EthScope.Eoa]
 * - EVM ERC4337: [EthScope.Eoa]
 * - BTC P2WPKH: [BtcScope.Mainnet] or [BtcScope.Testnet] based on address
 * - Solana: [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet]
 *
 * @param state - The state to migrate
 * @returns The migrated state
 */
export function migration66(state: unknown, migrationNumber: number) {
  if (!ensureValidState(state, migrationNumber)) {
    return state;
  }

  if (
    !hasProperty(state.engine.backgroundState, 'AccountsController') ||
    !isObject(state.engine.backgroundState.AccountsController) ||
    !hasProperty(
      state.engine.backgroundState.AccountsController,
      'internalAccounts',
    ) ||
    !isObject(
      state.engine.backgroundState.AccountsController.internalAccounts,
    ) ||
    !hasProperty(
      state.engine.backgroundState.AccountsController.internalAccounts,
      'accounts',
    ) ||
    !isObject(
      state.engine.backgroundState.AccountsController.internalAccounts.accounts,
    )
  ) {
    captureException(
      new Error(
        `Migration ${migrationNumber}: Invalid state structure for AccountsController`,
      ),
    );
    return state;
  }

  const accounts =
    state.engine.backgroundState.AccountsController.internalAccounts.accounts;

  for (const account of Object.values(accounts)) {
    if (!isObject(account) || !hasProperty(account, 'type')) {
      continue;
    }

    // Skip if account already has valid scopes
    if (
      hasProperty(account, 'scopes') &&
      Array.isArray(account.scopes) &&
      account.scopes.length > 0 &&
      account.scopes.every(
        (scope) => typeof scope === 'string' && isValidScope(scope),
      )
    ) {
      continue;
    }

    Logger.log(
      `Migration ${migrationNumber}: Adding scopes for account type ${account.type}`,
    );

    account.scopes = getScopesForAccountType(
      account.type as string,
      migrationNumber,
    );
  }

  return state;
}

/**
 * Migration for adding scopes to accounts in the AccountsController.
 */
export default function migrate(state: unknown) {
  return migration66(state, 66);
}
