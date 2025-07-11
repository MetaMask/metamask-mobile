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
      ),
    );
    return state;
  }

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
