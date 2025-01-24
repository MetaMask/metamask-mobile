import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';
import {
  BtcAccountType,
  BtcScopes,
  EthAccountType,
  EthScopes,
  SolAccountType,
  SolScopes,
} from '@metamask/keyring-api';
import { captureException } from '@sentry/react-native';

const migrationVersion = 66;

function getScopesForAccountType(accountType: string): string[] {
  switch (accountType) {
    case EthAccountType.Eoa:
    case EthAccountType.Erc4337:
      return [EthScopes.Namespace];
    case BtcAccountType.P2wpkh:
      // Default to mainnet scope if address is missing or invalid
      return [BtcScopes.Mainnet];
    case SolAccountType.DataAccount:
      return [SolScopes.Mainnet, SolScopes.Testnet, SolScopes.Devnet];
    default:
      // Default to EVM namespace for unknown account types
      captureException(
        new Error(
          `Migration ${migrationVersion}: Unknown account type ${accountType}, defaulting to EVM namespace`,
        ),
      );
      return [EthScopes.Namespace];
  }
}

/**
 * Migration for adding scopes to accounts in the AccountsController.
 * Each account type gets its appropriate scopes:
 * - EVM EOA: [EthScopes.Namespace]
 * - EVM ERC4337: [EthScopes.Namespace]
 * - BTC P2WPKH: [BtcScopes.Mainnet] or [BtcScopes.Testnet] based on address
 * - Solana: [SolScopes.Mainnet, SolScopes.Testnet, SolScopes.Devnet]
 *
 * @param state - The state to migrate
 * @returns The migrated state
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
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
        `Migration ${migrationVersion}: Invalid state structure for AccountsController`,
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
      account.scopes.every((scope) => typeof scope === 'string')
    ) {
      continue;
    }

    Logger.log(
      `Migration ${migrationVersion}: Adding scopes for account type ${account.type}`,
    );

    account.scopes = getScopesForAccountType(account.type as string);
  }

  return state;
}
