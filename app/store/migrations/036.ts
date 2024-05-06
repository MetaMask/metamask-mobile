import {
  EthAccountType,
  InternalAccount,
  EthMethod,
} from '@metamask/keyring-api';
import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { v4 as uuid } from 'uuid';
import { NativeModules } from 'react-native';
const Aes = NativeModules.Aes;

export interface Identity {
  name: string;
  address: string;
  lastSelected?: number;
}

export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;
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
  await createInternalAccountsForAccountsController(state);
  createSelectedAccountForAccountsController(state);
  return state;
}

export const sha256FromAddress = async (
  address: string,
): Promise<ArrayLike<number>> => {
  const sha256: string = await Aes.sha256(address);
  return Buffer.from(sha256).slice(0, 16);
};

function createDefaultAccountsController(state: Record<string, any>) {
  state.engine.backgroundState.AccountsController = {
    internalAccounts: {
      accounts: {},
      selectedAccount: '',
    },
  };
}

async function createInternalAccountsForAccountsController(
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
    const expectedId = uuid({
      random: await sha256FromAddress(identity.address),
    });

    accounts[expectedId] = {
      address: identity.address,
      id: expectedId,
      options: {},
      metadata: {
        name: identity.name,
        lastSelected: identity.lastSelected ?? undefined,
        keyring: {
          // This is default HD Key Tree type because the keyring is encrypted
          // during migration, the type will get updated when the during the
          // initial updateAccounts call.
          type: 'HD Key Tree',
        },
      },
      methods: [
        EthMethod.PersonalSign,
        EthMethod.Sign,
        EthMethod.SignTransaction,
        EthMethod.SignTypedDataV1,
        EthMethod.SignTypedDataV3,
        EthMethod.SignTypedDataV4,
      ],

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
