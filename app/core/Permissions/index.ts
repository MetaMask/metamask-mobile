import { captureException } from '@sentry/react-native';
import { errorCodes as rpcErrorCodes } from '@metamask/rpc-errors';
import { RestrictedMethods, CaveatTypes } from './constants';
import ImportedEngine from '../Engine';
import Logger from '../../util/Logger';
import { getUniqueList } from '../../util/general';
import TransactionTypes from '../TransactionTypes';
import { Hex } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { Caip25CaveatType, Caip25EndowmentPermissionName, getEthAccounts } from '@metamask/multichain';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

const INTERNAL_ORIGINS = [process.env.MM_FOX_CODE, TransactionTypes.MMM];

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Engine = ImportedEngine as any;

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsCaveatFromPermission(accountsPermission: any = {}) {
  return (
    Array.isArray(accountsPermission.caveats) &&
    accountsPermission.caveats.find(
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (caveat: any) => caveat.type === CaveatTypes.restrictReturnedAccounts,
    )
  );
}

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsPermissionFromSubject(subject: any = {}) {
  return subject.permissions?.eth_accounts || {};
}

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsFromPermission(accountsPermission: any) {
  const accountsCaveat = getAccountsCaveatFromPermission(accountsPermission);
  return accountsCaveat && Array.isArray(accountsCaveat.value)
    ? accountsCaveat.value.map((address: string) => address.toLowerCase())
    : [];
}

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsFromSubject(subject: any) {
  return getAccountsFromPermission(getAccountsPermissionFromSubject(subject));
}

export const getPermittedAccountsByHostname = (
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any,
  hostname: string,
) => {
  const subjects = state.subjects;
  const accountsByHostname = Object.keys(subjects).reduce(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: any, subjectKey) => {
      const accounts = getAccountsFromSubject(subjects[subjectKey]);
      if (accounts.length > 0) {
        acc[subjectKey] = accounts;
      }
      return acc;
    },
    {},
  );

  return accountsByHostname?.[hostname] || [];
};

export const switchActiveAccounts = (hostname: string, accAddress: string) => {
  const { PermissionController } = Engine.context;
  const existingPermittedAccountAddresses: string[] =
    PermissionController.getCaveat(
      hostname,
      RestrictedMethods.eth_accounts,
      CaveatTypes.restrictReturnedAccounts,
    ).value;
  const accountIndex = existingPermittedAccountAddresses.findIndex(
    (address) => address === accAddress,
  );
  if (accountIndex === -1) {
    throw new Error(
      `eth_accounts permission for hostname "${hostname}" does not permit "${accAddress} account".`,
    );
  }
  let newPermittedAccountAddresses = [...existingPermittedAccountAddresses];
  newPermittedAccountAddresses.splice(accountIndex, 1);
  newPermittedAccountAddresses = getUniqueList([
    accAddress,
    ...newPermittedAccountAddresses,
  ]);

  PermissionController.updateCaveat(
    hostname,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newPermittedAccountAddresses,
  );
};

export const addPermittedAccounts = (
  hostname: string,
  addresses: string[],
): string => {
  const { PermissionController } = Engine.context;
  const existing = PermissionController.getCaveat(
    hostname,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
  );
  const existingPermittedAccountAddresses: string[] = existing.value;

  const newPermittedAccountsAddresses = getUniqueList(
    addresses,
    existingPermittedAccountAddresses,
  );

  // No change in permitted account addresses
  if (
    newPermittedAccountsAddresses.length ===
    existingPermittedAccountAddresses.length
  ) {
    console.error(
      `eth_accounts permission for hostname: (${hostname}) already exists for account addresses: (${existingPermittedAccountAddresses}).`,
    );
    return existingPermittedAccountAddresses[0];
  }

  PermissionController.updateCaveat(
    hostname,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newPermittedAccountsAddresses,
  );

  return newPermittedAccountsAddresses[0];
};

export const removePermittedAccounts = (
  hostname: string,
  accounts: string[],
) => {
  const { PermissionController } = Engine.context;
  const existing = PermissionController.getCaveat(
    hostname,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
  );
  const remainingAccounts = existing.value.filter(
    (address: string) => !accounts.includes(address),
  );

  if (remainingAccounts.length === 0) {
    PermissionController.revokePermission(
      hostname,
      RestrictedMethods.eth_accounts,
    );
  } else {
    PermissionController.updateCaveat(
      hostname,
      RestrictedMethods.eth_accounts,
      CaveatTypes.restrictReturnedAccounts,
      remainingAccounts,
    );
  }
};

export const removeAccountsFromPermissions = async (addresses: string[]) => {
  const { PermissionController } = Engine.context;
  for (const subject in PermissionController.state.subjects) {
    try {
      removePermittedAccounts(subject, addresses);
    } catch (e) {
      Logger.log(
        e,
        'Failed to remove account from permissions after deleting account from wallet.',
      );
    }
  }
};

/**
 * Checks that all accounts referenced have a matching InternalAccount. Sends
 * an error to sentry for any accounts that were expected but are missing from the wallet.
 *
 * @param [internalAccounts] - The list of evm accounts the wallet knows about.
 * @param [accounts] - The list of evm accounts addresses that should exist.
 */
const captureKeyringTypesWithMissingIdentities = (
  internalAccounts: InternalAccount[] = [],
  accounts: Hex[] = [],
) => {
  const accountsMissingIdentities = accounts.filter(
    (address) =>
      !internalAccounts.some(
        (account) => account.address.toLowerCase() === address.toLowerCase(),
      ),
  );
  const keyringTypesWithMissingIdentities = accountsMissingIdentities.map(
    (address) => Engine.context.KeyringController.getAccountKeyringType(address),
  );

  const internalAccountCount = internalAccounts.length;

  const accountTrackerCount = Object.keys(
    Engine.context.AccountTrackerController.state.accounts || {},
  ).length;

  captureException(
    new Error(
      `Attempt to get permission specifications failed because their were ${accounts.length} accounts, but ${internalAccountCount} identities, and the ${keyringTypesWithMissingIdentities} keyrings included accounts with missing identities. Meanwhile, there are ${accountTrackerCount} accounts in the account tracker.`,
    ),
  );
};

  /**
   * Sorts a list of evm account addresses by most recently selected by using
   * the lastSelected value for the matching InternalAccount object stored in state.
   *
   * @param accounts - The list of evm accounts addresses to sort.
   * @returns The sorted evm accounts addresses.
   */
const sortAccountsByLastSelected = (accounts: Hex[]) => {
    const internalAccounts: InternalAccount[] = Engine.context.AccountsController.listAccounts();

    return accounts.sort((firstAddress, secondAddress) => {
      const firstAccount = internalAccounts.find(
        (internalAccount) =>
          internalAccount.address.toLowerCase() === firstAddress.toLowerCase(),
      );

      const secondAccount = internalAccounts.find(
        (internalAccount) =>
          internalAccount.address.toLowerCase() === secondAddress.toLowerCase(),
      );

      if (!firstAccount) {
        captureKeyringTypesWithMissingIdentities(
          internalAccounts,
          accounts,
        );
        throw new Error(`Missing identity for address: "${firstAddress}".`);
      } else if (!secondAccount) {
        captureKeyringTypesWithMissingIdentities(
          internalAccounts,
          accounts,
        );
        throw new Error(`Missing identity for address: "${secondAddress}".`);
      } else if (
        firstAccount.metadata.lastSelected ===
        secondAccount.metadata.lastSelected
      ) {
        return 0;
      } else if (firstAccount.metadata.lastSelected === undefined) {
        return 1;
      } else if (secondAccount.metadata.lastSelected === undefined) {
        return -1;
      }

      return (
        secondAccount.metadata.lastSelected - firstAccount.metadata.lastSelected
      );
    });
  };

  /**
   * Gets the sorted permitted accounts for the specified origin. Returns an empty
   * array if no accounts are permitted or the wallet is locked. Returns any permitted
   * accounts if the wallet is locked and `ignoreLock` is true. This lock bypass is needed
   * for the `eth_requestAccounts` & `wallet_getPermission` handlers both of which
   * return permissioned accounts to the dapp when the wallet is locked.
   *
   * @param {string} origin - The origin whose exposed accounts to retrieve.
   * @param {object} [options] - The options object
   * @param {boolean} [options.ignoreLock] - If accounts should be returned even if the wallet is locked.
   * @returns {Promise<string[]>} The origin's permitted accounts, or an empty
   * array.
   */
  export const getPermittedAccounts = (origin: string, { ignoreLock }: { ignoreLock?: boolean } = {}) => {
  const { AccountsController, PermissionController, KeyringController } = Engine.context;

    let caveat;
    try {
      if (INTERNAL_ORIGINS.includes(origin)) {
        const selectedAccountAddress =
          AccountsController.getSelectedAccount().address;

        return [selectedAccountAddress];
      }

      caveat = PermissionController.getCaveat(
        origin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );
    } catch (err) {
      if (err instanceof PermissionDoesNotExistError) {
        // suppress expected error in case that the origin
        // does not have the target permission yet
        return [];
      }
      throw err;
    }

    if (!KeyringController.isUnlocked() && !ignoreLock) {
      return [];
    }

    const ethAccounts = getEthAccounts(caveat.value);
    return sortAccountsByLastSelected(ethAccounts);
  };
