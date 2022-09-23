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

export const getPermittedAccountsByOrigin = (state: any, origin: string) => {
  const subjects = state.subjects;
  const accountsByOrigin = Object.keys(subjects).reduce(
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

  return accountsByOrigin?.[origin] || [];
};

export const switchActiveAccounts = (origin: string, accAddress: string) => {
  const { PermissionController } = Engine.context;
  const existingAccounts: SelectedAccount[] = PermissionController.getCaveat(
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
  ).value;
  const accountIndex = existingAccounts.findIndex(
    ({ address }) => address === accAddress,
  );
  if (accountIndex === -1) {
    throw new Error(
      `eth_accounts permission for origin "${origin}" does not permit "${accAddress} account".`,
    );
  }
  let newAccounts = [...existingAccounts];
  newAccounts.splice(accountIndex, 1);
  newAccounts = [{ address: accAddress, lastUsed: Date.now() }, ...newAccounts];

  PermissionController.updateCaveat(
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newAccounts,
  );
};

export const addPermittedAccounts = (
  origin: string,
  addresses: string[],
): string => {
  const { PermissionController } = Engine.context;
  const existing = PermissionController.getCaveat(
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
  );
  const existingPermittedAccountAddresses = existing.value.map(
    ({ address }: { address: string }) => address,
  );

  for (const address in addresses) {
    if (existingPermittedAccountAddresses.includes(address)) {
      throw new Error(
        `eth_accounts permission for origin "${origin}" already permits account "${address}".`,
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
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newSortedAccounts,
  );

  return newSortedAccounts[0].address;
};

export const removeAccountFromPermissions = async (address: string) => {
  const { PermissionController } = Engine.context;
  for (const subject in PermissionController.state.subjects) {
    try {
      removePermittedAccount(subject, address);
    } catch (e) {
      Logger.log(
        e,
        'Failed to remove account from permissions after deleting account from wallet.',
      );
    }
  }
};

export const removePermittedAccount = (origin: string, account: string) => {
  const { PermissionController } = Engine.context;

  const existing = PermissionController.getCaveat(
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
  );
  const existingPermittedAccountAddresses = existing.value.map(
    ({ address }: { address: string }) => address,
  );

  if (!existingPermittedAccountAddresses.includes(account)) {
    throw new Error(
      `eth_accounts permission for origin "${origin}" already does not permit account "${account}".`,
    );
  }

  const remainingAccounts = existing.value.filter(
    ({ address }: { address: string }) => address !== account,
  );

  if (remainingAccounts.length === 0) {
    PermissionController.revokePermission(
      origin,
      RestrictedMethods.eth_accounts,
    );
  } else {
    PermissionController.updateCaveat(
      origin,
      RestrictedMethods.eth_accounts,
      CaveatTypes.restrictReturnedAccounts,
      remainingAccounts,
    );
  }
};

export const getPermittedAccounts = async (origin: string) => {
  try {
    const accountsWithLastUsed =
      await Engine.context.PermissionController.executeRestrictedMethod(
        origin,
        RestrictedMethods.eth_accounts,
      );
    return accountsWithLastUsed.map(
      ({ address }: { address: string }) => address,
    );
  } catch (error: any) {
    if (error.code === rpcErrorCodes.provider.unauthorized) {
      return [];
    }
    throw error;
  }
};
