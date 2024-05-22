import { errorCodes as rpcErrorCodes } from '@metamask/rpc-errors';
import { RestrictedMethods, CaveatTypes } from './constants';
import ImportedEngine from '../Engine';
import Logger from '../../util/Logger';
import { getUniqueList } from '../../util/general';
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
    ? accountsCaveat.value.map((address: string) => address.toLowerCase())
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
    const accounts =
      await Engine.context.PermissionController.executeRestrictedMethod(
        hostname,
        RestrictedMethods.eth_accounts,
      );
    return accounts;
  } catch (error: any) {
    if (error.code === rpcErrorCodes.provider.unauthorized) {
      return [];
    }
    throw error;
  }
};
