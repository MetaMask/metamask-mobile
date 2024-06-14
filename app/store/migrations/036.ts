import { EthAccountType, InternalAccount } from '@metamask/keyring-api';
import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { getUUIDFromAddressOfNormalAccount } from '@metamask/accounts-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { ETH_EOA_METHODS } from '../../constants/eth-methods';

export interface Identity {
  name: string;
  address: string;
  lastSelected?: number;
  importTime?: number;
}

export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 36: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 36: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 36: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }
  if (!isObject(state.engine.backgroundState.PreferencesController)) {
    captureException(
      new Error(
        `Migration 36: Invalid PreferencesController state: '${typeof state
          .engine.backgroundState.PreferencesController}'`,
      ),
    );
    return state;
  }
  if (
    !hasProperty(
      state.engine.backgroundState.PreferencesController,
      'identities',
    )
  ) {
    captureException(
      new Error(
        `Migration 36: Missing identities property from PreferencesController: '${typeof state
          .engine.backgroundState.PreferencesController}'`,
      ),
    );
    return state;
  }
  createDefaultAccountsController(state);
  createInternalAccountsForAccountsController(state);
  createSelectedAccountForAccountsController(state);
  return state;
}

function createDefaultAccountsController(state: Record<string, any>) {
  state.engine.backgroundState.AccountsController = {
    internalAccounts: {
      accounts: {},
      selectedAccount: '',
    },
  };
}

function createInternalAccountsForAccountsController(
  state: Record<string, any>,
) {
  const identities: {
    [key: string]: Identity;
  } = state.engine.backgroundState.PreferencesController?.identities || {};

  if (Object.keys(identities).length === 0) {
    captureException(
      new Error(`Migration 36: PreferencesController?.identities are empty'`),
    );
    return;
  }

  const accounts: Record<string, InternalAccount> = {};

  for (const identity of Object.values(identities)) {
    const lowerCaseAddress = identity.address.toLocaleLowerCase();
    const expectedId = getUUIDFromAddressOfNormalAccount(lowerCaseAddress);

    accounts[expectedId] = {
      address: identity.address,
      id: expectedId,
      options: {},
      metadata: {
        name: identity.name,
        importTime: identity.importTime ?? Date.now(),
        lastSelected: identity.lastSelected ?? undefined,
        keyring: {
          // This is default HD Key Tree type because the keyring is encrypted
          // during migration, the type will get updated when the during the
          // initial updateAccounts call.
          type: KeyringTypes.hd,
        },
      },
      methods: ETH_EOA_METHODS,

      type: EthAccountType.Eoa,
    };
  }
  state.engine.backgroundState.AccountsController.internalAccounts.accounts =
    accounts;
}

function findInternalAccountByAddress(
  state: Record<string, any>,
  address: string,
): InternalAccount | undefined {
  return Object.values<InternalAccount>(
    state.engine.backgroundState.AccountsController.internalAccounts.accounts,
  ).find(
    (account: InternalAccount) =>
      account.address.toLowerCase() === address.toLowerCase(),
  );
}

function createSelectedAccountForAccountsController(
  state: Record<string, any>,
) {
  const selectedAddress =
    state.engine.backgroundState.PreferencesController?.selectedAddress;

  // Handle the case where the selectedAddress from preferences controller is either not defined or not a string
  if (!selectedAddress || typeof selectedAddress !== 'string') {
    captureException(
      new Error(
        `Migration 36: Invalid selectedAddress. state.engine.backgroundState.PreferencesController?.selectedAddress is not a string:'${typeof selectedAddress}'. Setting selectedAddress to the first account.`,
      ),
    );
    // Get the first account if selectedAddress is not a string
    const [firstAddress] = Object.keys(
      state.engine.backgroundState.PreferencesController?.identities,
    );
    const internalAccount = findInternalAccountByAddress(state, firstAddress);
    if (internalAccount) {
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        internalAccount.id;
      state.engine.backgroundState.PreferencesController.selectedAddress =
        internalAccount.address;
    }
    return;
  }

  const selectedAccount = findInternalAccountByAddress(state, selectedAddress);
  if (selectedAccount) {
    state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
      selectedAccount.id;
  }
}
