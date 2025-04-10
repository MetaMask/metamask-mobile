import { errorCodes as rpcErrorCodes } from '@metamask/rpc-errors';
import { RestrictedMethods, CaveatTypes } from './constants';
import ImportedEngine from '../Engine';
import Logger from '../../util/Logger';
import { getUniqueList } from '../../util/general';
import TransactionTypes from '../TransactionTypes';
import { PermissionKeys } from './specifications';
import { KnownCaipNamespace } from '@metamask/utils';

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
 * Get permitted accounts for the given the host.
 *
 * @param hostname - Subject to check if permissions exists. Ex: A Dapp is a subject.
 * @returns An array containing permitted accounts for the specified host.
 * The active account is the first item in the returned array.
 */
export const getPermittedAccounts = async (
  hostname: string,
): Promise<string[]> => {
  const { AccountsController } = Engine.context;

  try {
    if (INTERNAL_ORIGINS.includes(hostname)) {
      const selectedAccountAddress =
        AccountsController.getSelectedAccount().address;

      return [selectedAccountAddress];
    }

    const accounts =
      await Engine.context.PermissionController.executeRestrictedMethod(
        hostname,
        RestrictedMethods.eth_accounts,
      );
    Logger.log('getPermittedAccounts', accounts);
    return accounts;
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === rpcErrorCodes.provider.unauthorized) {
      Logger.log('getPermittedAccounts', 'Unauthorized');
      return [];
    }
    throw error;
  }
};

/**
 * Get permitted chains for the given the host.
 *
 * @param hostname - Subject to check if permissions exists. Ex: A Dapp is a subject.
 * @returns An array containing permitted chains for the specified host.
 */
export const getPermittedChains = async (
  hostname: string,
): Promise<string[]> => {
  const { PermissionController } = Engine.context;
  const caveat = PermissionController.getCaveat(
    hostname,
    PermissionKeys.permittedChains,
    CaveatTypes.restrictNetworkSwitching,
  );

  if (Array.isArray(caveat?.value)) {
    const chains = caveat.value
      .filter(
        (item: unknown): item is string =>
          typeof item === 'string' && !isNaN(parseInt(item)),
      )
      .map(
        (chainId: string) =>
          `${KnownCaipNamespace.Eip155}:${parseInt(chainId)}`,
      );

    return chains;
  }

  return [];
};
