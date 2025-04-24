import { CaipChainId, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';
import {
  BtcAccountType,
  BtcScope,
  EthAccountType,
  EthScope,
  KeyringAccount,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import { captureException } from '@sentry/react-native';
import { isBtcMainnetAddress } from '../../core/Multichain/utils';

// Helper to check if a scope is a valid enum value
function isValidScope(scope: string): boolean {
  return (
    Object.values(EthScope).includes(scope as EthScope) ||
    Object.values(BtcScope).includes(scope as BtcScope) ||
    Object.values(SolScope).includes(scope as SolScope)
  );
}

function getScopesForAccountType(
  account: KeyringAccount,
  migrationNumber: number,
): CaipChainId[] {
  switch (account.type) {
    case EthAccountType.Eoa:
      return [EthScope.Eoa];
    case EthAccountType.Erc4337: {
      // EVM Erc4337 account
      // NOTE: A Smart Contract account might not be compatible with every chain, in this case we just default
      // to testnet since we cannot really "guess" it from here.
      // Also, there's no official Snap as of today that uses this account type. So this case should never happen
      // in production.
      return [EthScope.Testnet];
    }
    case BtcAccountType.P2wpkh: {
      // Bitcoin uses different accounts for testnet and mainnet
      return [
        isBtcMainnetAddress(account.address)
          ? BtcScope.Mainnet
          : BtcScope.Testnet,
      ];
    }
    case SolAccountType.DataAccount:
      return [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet];
    default:
      // Default to EVM namespace for unknown account types
      captureException(
        new Error(
          `Migration ${migrationNumber}: Unknown account type ${account.type}, defaulting to EVM EOA`,
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
export async function migration66(state: unknown, migrationNumber: number) {
  // eslint-disable-next-line no-console
  console.log(`Migration 66/67 (running as ${migrationNumber}) started`);
  
  await new Promise<void>((res) => setTimeout(() => res(), 5000));

  // eslint-disable-next-line no-console
  console.log(`Migration 66/67 (running as ${migrationNumber}) timeout completed`);

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
      account as KeyringAccount,
      migrationNumber,
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Migration 66/67 (running as ${migrationNumber}) completed`);
  return state;
}


/**
 * Migration for adding scopes to accounts in the AccountsController.
 */
export default function migrate(state: unknown) {
  return migration66(state, 66);
}
