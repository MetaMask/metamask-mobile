import { errorCodes as rpcErrorCodes } from '@metamask/rpc-errors';
import { RestrictedMethods, CaveatTypes } from './constants';
import ImportedEngine from '../Engine';
import Logger from '../../util/Logger';
import { getUniqueList } from '../../util/general';
import TransactionTypes from '../TransactionTypes';
import {
  PermissionConstraint,
  PermissionControllerState,
  PermissionSubjectEntry,
} from '@metamask/permission-controller';

const INTERNAL_ORIGINS = [process.env.MM_FOX_CODE, TransactionTypes.MMM];

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Engine = ImportedEngine as any;

function getAccountsCaveatFromPermission(
  accountsPermission: PermissionConstraint,
) {
  return accountsPermission.caveats?.find(
    (caveat) => caveat.type === CaveatTypes.restrictReturnedAccounts,
  );
}

function getAccountsPermissionFromSubject(
  subject: PermissionSubjectEntry<PermissionConstraint>,
) {
  return subject.permissions?.eth_accounts || {};
}

function getAccountsFromPermission(accountsPermission: PermissionConstraint) {
  const accountsCaveat = getAccountsCaveatFromPermission(accountsPermission);
  return accountsCaveat?.value && Array.isArray(accountsCaveat.value)
    ? // @ts-expect-error FIXME: Types imply that this is JSON[] but we're accessing it as string[]
      accountsCaveat.value.map((address: string) => address.toLowerCase())
    : [];
}

function getAccountsFromSubject(
  subject: PermissionSubjectEntry<PermissionConstraint>,
) {
  return getAccountsFromPermission(getAccountsPermissionFromSubject(subject));
}

/**
 * Returns the permitted accounts for a given subject
 *
 * @param state - State of the PermissionController
 * @param subject - The subject to get the permitted accounts for
 * @returns An array containing the permitted accounts for the specified subject, first account is the active account for the subject
 */
export const getPermittedAccountsBySubject = (
  state: PermissionControllerState<PermissionConstraint>,
  subject: string,
): string[] => {
  const subjects = state.subjects;
  const accountsBySubject = Object.keys(subjects).reduce((acc, subjectKey) => {
    const accounts = getAccountsFromSubject(subjects[subjectKey]);
    if (accounts.length > 0) {
      acc[subjectKey] = accounts;
    }
    return acc;
  }, {} as Record<string, string[]>);

  return accountsBySubject?.[subject] || [];
};

export const switchActiveAccounts = (origin: string, accAddress: string) => {
  const { PermissionController } = Engine.context;
  const existingPermittedAccountAddresses: string[] =
    PermissionController.getCaveat(
      origin,
      RestrictedMethods.eth_accounts,
      CaveatTypes.restrictReturnedAccounts,
    ).value;
  const accountIndex = existingPermittedAccountAddresses.findIndex(
    (address) => address === accAddress,
  );
  if (accountIndex === -1) {
    throw new Error(
      `eth_accounts permission for origin "${origin}" does not permit "${accAddress} account".`,
    );
  }
  let newPermittedAccountAddresses = [...existingPermittedAccountAddresses];
  newPermittedAccountAddresses.splice(accountIndex, 1);
  newPermittedAccountAddresses = getUniqueList([
    accAddress,
    ...newPermittedAccountAddresses,
  ]);

  PermissionController.updateCaveat(
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newPermittedAccountAddresses,
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
      `eth_accounts permission for origin: (${origin}) already exists for account addresses: (${existingPermittedAccountAddresses}).`,
    );
    return existingPermittedAccountAddresses[0];
  }

  PermissionController.updateCaveat(
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
    newPermittedAccountsAddresses,
  );

  return newPermittedAccountsAddresses[0];
};

export const removePermittedAccounts = (origin: string, accounts: string[]) => {
  const { PermissionController } = Engine.context;
  const existing = PermissionController.getCaveat(
    origin,
    RestrictedMethods.eth_accounts,
    CaveatTypes.restrictReturnedAccounts,
  );
  const remainingAccounts = existing.value.filter(
    (address: string) => !accounts.includes(address),
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
 * Get permitted accounts for the given the subject.
 *
 * @param subject - Subject to check if permissions exists. Ex: A Dapp is a subject.
 * @returns An array containing permitted accounts for the specified host.
 * The active account is the first item in the returned array.
 */
export const getPermittedAccounts = async (
  subject: string,
): Promise<string[]> => {
  const { AccountsController } = Engine.context;

  try {
    if (INTERNAL_ORIGINS.includes(subject)) {
      const selectedAccountAddress =
        AccountsController.getSelectedAccount().address;

      return [selectedAccountAddress];
    }

    const accounts =
      await Engine.context.PermissionController.executeRestrictedMethod(
        subject,
        RestrictedMethods.eth_accounts,
      );
    return accounts;
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === rpcErrorCodes.provider.unauthorized) {
      return [];
    }
    throw error;
  }
};
