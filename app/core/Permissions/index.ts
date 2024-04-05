import { errorCodes as rpcErrorCodes } from 'eth-rpc-errors';
import { orderBy } from 'lodash';
import { RestrictedMethods, CaveatTypes } from './constants';
import ImportedEngine from '../Engine';
import { SelectedAccount } from '../../components/UI/AccountSelectorList/AccountSelectorList.types';
import Logger from '../../util/Logger';
const Engine = ImportedEngine as any;

function getAccountsCaveatFromPermission(accountsPermission: any = {}) {
  return (
    Array.isArray(accountsPermission.caveats) &&
    accountsPermission.caveats.find(
      (caveat: any) => caveat.type === CaveatTypes.restrictReturnedAccounts,
    )
  );
}

function getAccountsPermissionFromSubject(subject: any = {}) {
  return subject.permissions?.eth_accounts || {};
}

function getAccountsFromPermission(accountsPermission: any) {
  const accountsCaveat = getAccountsCaveatFromPermission(accountsPermission);
  return accountsCaveat && Array.isArray(accountsCaveat.value)
    ? accountsCaveat.value
    : [];
}

function getAccountsFromSubject(subject: any) {
  return getAccountsFromPermission(getAccountsPermissionFromSubject(subject));
}

export const getPermittedAccountsByHostname = (
  state: any,
  hostname: string,
) => {
  const subjects = state.subjects;
  const accountsByHostname = Object.keys(subjects).reduce(
    (acc: any, subjectKey) => {
      const accounts = getAccountsFromSubject(subjects[subjectKey]);
      if (accounts.length > 0) {
        acc[subjectKey] = accounts.map(
          ({ address }: { address: string }) => address,
        );
      }
      return acc;
    },
    {},
  );

  return accountsByHostname?.[hostname] || [];
};

export const switchActiveAccounts = (hostname: string, accAddress: string) => {
  const { PermissionController } = Engine.context;
  const existingAccounts: SelectedAccount[] = PermissionController.getCaveat(
    hostname,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
  ).value;
  const accountIndex = existingAccounts.findIndex(
    ({ address }) => address === accAddress,
  );
  if (accountIndex === -1) {
    throw new Error(
      `eth_accounts permission for hostname "${hostname}" does not permit "${accAddress} account".`,
    );
  }
  let newAccounts = [...existingAccounts];
  newAccounts.splice(accountIndex, 1);
  newAccounts = [{ address: accAddress, lastUsed: Date.now() }, ...newAccounts];

  PermissionController.updateCaveat(
    hostname,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newAccounts,
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
  const existingPermittedAccountAddresses = existing.value.map(
    ({ address }: { address: string }) => address,
  );

  for (const address in addresses) {
    if (existingPermittedAccountAddresses.includes(address)) {
      throw new Error(
        `eth_accounts permission for hostname "${hostname}" already permits account "${address}".`,
      );
    }
  }

  const selectedAccounts: SelectedAccount[] = addresses.map(
    (address, index) => ({ address, lastUsed: Date.now() - index }),
  );

  const newSortedAccounts = orderBy<SelectedAccount>(
    [...existing.value, ...selectedAccounts],
    'lastUsed',
    'desc',
  );

  PermissionController.updateCaveat(
    hostname,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newSortedAccounts,
  );

  return newSortedAccounts[0].address;
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
    ({ address }: { address: string }) => !accounts.includes(address),
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
 * Get permitted accounts for the given the host.
 *
 * @param hostname - Subject to check if permissions exists. Ex: A Dapp is a subject.
 * @returns An array containing permitted accounts for the specified host.
 * The active account is the first item in the returned array.
 */
export const getPermittedAccounts = async (
  hostname: string,
): Promise<string[]> => {
  try {
    const accountsWithLastUsed =
      await Engine.context.PermissionController.executeRestrictedMethod(
        hostname,
        RestrictedMethods.eth_accounts,
      );
    return accountsWithLastUsed.map(({ address }: { address: string }) =>
      address.toLowerCase(),
    );
  } catch (error: any) {
    if (error.code === rpcErrorCodes.provider.unauthorized) {
      return [];
    }
    throw error;
  }
};
