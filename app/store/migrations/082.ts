<<<<<<< HEAD
import { hasProperty, Hex, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import { isEvmAccountType } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { Token } from '@metamask/assets-controllers';

interface AllTokens {
  [chainId: Hex]: { [key: string]: Token[] };
}
interface AllDetectedTokens {
  [chainId: Hex]: { [key: string]: Token[] };
}
interface AllIgnoredTokens {
  [chainId: Hex]: { [key: string]: Token[] };
}

/**
 * Migration 82: removes from the TokensController state all tokens that belong to an EVM account that has been removed.
 * Also removes from TokenBalancesController all balances that belong to an EVM account that has been removed.
 */

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, 82)) {
    return state;
  }

  const tokenBalancesControllerState =
    state.engine.backgroundState.TokenBalancesController;

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  const tokensControllerState = state.engine.backgroundState.TokensController;

  if (
    !isObject(tokenBalancesControllerState) ||
    !hasProperty(tokenBalancesControllerState, 'tokenBalances') ||
    !isObject(tokenBalancesControllerState.tokenBalances)
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 82: Invalid TokenBalancesController state error: '${typeof tokenBalancesControllerState}'`,
=======
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 82: Reset PhishingController phishingLists
 *
 * This migration resets only the phishingLists array in the PhishingController state
 * while preserving all other state properties. This allows the app to rebuild the lists
 * while maintaining user preferences and configuration.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 82;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state, 'engine') ||
      !isObject(state.engine) ||
      !hasProperty(state.engine, 'backgroundState') ||
      !isObject(state.engine.backgroundState)
    ) {
      captureException(
        new Error(
          `Migration 082: Invalid engine state structure`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(state.engine.backgroundState, 'PhishingController') ||
      !isObject(state.engine.backgroundState.PhishingController)
    ) {
      captureException(
        new Error(
          `Migration 082: Invalid PhishingController state: '${JSON.stringify(
            state.engine.backgroundState.PhishingController,
          )}'`,
        ),
      );
      return state;
    }

    // Only reset the phishingLists field to an empty array
    // while preserving all other fields
    state.engine.backgroundState.PhishingController.phishingLists = [];
    state.engine.backgroundState.PhishingController.stalelistLastFetched = 0;

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 082: cleaning PhishingController state failed with error: ${error}`,
>>>>>>> stable
      ),
    );
    return state;
  }
<<<<<<< HEAD

  if (
    !isObject(tokensControllerState) ||
    !hasProperty(tokensControllerState, 'allTokens') ||
    !isObject(tokensControllerState.allTokens) ||
    !hasProperty(tokensControllerState, 'allDetectedTokens') ||
    !isObject(tokensControllerState.allDetectedTokens) ||
    !hasProperty(tokensControllerState, 'allIgnoredTokens') ||
    !isObject(tokensControllerState.allIgnoredTokens)
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 82: Invalid TokensController state error: '${typeof tokensControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !isObject(accountsControllerState) ||
    !hasProperty(accountsControllerState, 'internalAccounts') ||
    !isObject(accountsControllerState.internalAccounts) ||
    !hasProperty(accountsControllerState.internalAccounts, 'accounts') ||
    !isObject(accountsControllerState.internalAccounts.accounts)
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 82: Invalid AccountsController state error: '${typeof accountsControllerState}'`,
      ),
    );
    return state;
  }

  const { internalAccounts } = accountsControllerState;

  const accounts = Object.values(
    internalAccounts.accounts as Record<string, InternalAccount>,
  );
  const evmAccounts = accounts.filter((account) =>
    isEvmAccountType(account.type),
  );
  const evmAccountAddresses = evmAccounts.map((account) => account.address);

  // Check and clean up tokens in allTokens that do not belong to any EVM account
  if (hasProperty(tokensControllerState, 'allTokens')) {
    for (const [chainId, accountsTokens] of Object.entries(
      tokensControllerState.allTokens,
    )) {
      for (const account of Object.keys(
        accountsTokens as Record<`0x${string}`, Token[]>,
      )) {
        if (!evmAccountAddresses.includes(account)) {
          delete (tokensControllerState.allTokens as AllTokens)[chainId as Hex][
            account
          ];
        }
      }
    }
  }

  // Check and clean up tokens in allDetectedTokens that do not belong to any EVM account
  if (hasProperty(tokensControllerState, 'allDetectedTokens')) {
    for (const [chainId, accountsTokens] of Object.entries(
      tokensControllerState.allDetectedTokens,
    )) {
      for (const account of Object.keys(
        accountsTokens as Record<`0x${string}`, Token[]>,
      )) {
        if (!evmAccountAddresses.includes(account)) {
          delete (tokensControllerState.allDetectedTokens as AllDetectedTokens)[
            chainId as Hex
          ][account];
        }
      }
    }
  }

  // Check and clean up tokens in allIgnoredTokens that do not belong to any EVM account
  if (hasProperty(tokensControllerState, 'allIgnoredTokens')) {
    for (const [chainId, accountsTokens] of Object.entries(
      tokensControllerState.allIgnoredTokens,
    )) {
      for (const account of Object.keys(
        accountsTokens as Record<`0x${string}`, Token[]>,
      )) {
        if (!evmAccountAddresses.includes(account)) {
          delete (tokensControllerState.allIgnoredTokens as AllIgnoredTokens)[
            chainId as Hex
          ][account];
        }
      }
    }
  }

  // Check and clean up balances in tokenBalancesControllerState that do not belong to any EVM account
  if (hasProperty(tokenBalancesControllerState, 'tokenBalances')) {
    for (const accountAddress of Object.keys(
      tokenBalancesControllerState.tokenBalances,
    )) {
      if (!evmAccountAddresses.includes(accountAddress)) {
        delete tokenBalancesControllerState.tokenBalances[
          accountAddress as Hex
        ];
      }
    }
  }

  return state;
};

export default migration;
=======
};

export default migration; 
>>>>>>> stable
