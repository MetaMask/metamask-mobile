import { captureException } from '@sentry/react-native';
import ImportedEngine from '../Engine';
import Logger from '../../util/Logger';
import TransactionTypes from '../TransactionTypes';
import { KnownCaipNamespace, Hex, CaipChainId } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  getEthAccounts,
  getPermittedEthChainIds,
  setEthAccounts,
  setPermittedEthChainIds,
} from '@metamask/chain-agnostic-permission';
import {
  CaveatConstraint,
  PermissionDoesNotExistError,
} from '@metamask/permission-controller';

const INTERNAL_ORIGINS = [process.env.MM_FOX_CODE, TransactionTypes.MMM];

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Engine = ImportedEngine as any;

/**
 * Checks that all accounts referenced have a matching InternalAccount. Sends
 * an error to sentry for any accounts that were expected but are missing from the wallet.
 *
 * @param [internalAccounts] - The list of evm accounts the wallet knows about.
 * @param [accounts] - The list of evm accounts addresses that should exist.
 */
export const captureKeyringTypesWithMissingIdentities = (
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
    (address) =>
      Engine.context.KeyringController.getAccountKeyringType(address),
  );

  const internalAccountCount = internalAccounts.length;

  const accountTrackerCount = Object.keys(
    Engine.context.AccountTrackerController.state.accounts || {},
  ).length;

  captureException(
    new Error(
      `Attempt to get permission specifications failed because there were ${accounts.length} accounts, but ${internalAccountCount} identities, and the ${keyringTypesWithMissingIdentities} keyrings included accounts with missing identities. Meanwhile, there are ${accountTrackerCount} accounts in the account tracker.`,
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
export const sortAccountsByLastSelected = (accounts: Hex[]) => {
  const internalAccounts: InternalAccount[] =
    Engine.context.AccountsController.listAccounts();

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
      captureKeyringTypesWithMissingIdentities(internalAccounts, accounts);
      throw new Error(`Missing identity for address: "${firstAddress}".`);
    } else if (!secondAccount) {
      captureKeyringTypesWithMissingIdentities(internalAccounts, accounts);
      throw new Error(`Missing identity for address: "${secondAddress}".`);
    } else if (
      firstAccount.metadata.lastSelected === secondAccount.metadata.lastSelected
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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAccountsFromSubject(subject: any) {
  const caveats =
    subject.permissions?.[Caip25EndowmentPermissionName]?.caveats || [];

  const caveat = caveats.find(
    ({ type }: CaveatConstraint) => type === Caip25CaveatType,
  );
  if (caveat) {
    const ethAccounts = getEthAccounts(caveat.value);
    const lowercasedEthAccounts = ethAccounts.map((address: string) =>
      address.toLowerCase(),
    );
    return sortAccountsByLastSelected(lowercasedEthAccounts as Hex[]);
  }

  return [];
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

/**
 * Returns a default CAIP-25 caveat value.
 * @returns Default {@link Caip25CaveatValue}
 */
export const getDefaultCaip25CaveatValue = (): Caip25CaveatValue => ({
  requiredScopes: {},
  optionalScopes: {
    'wallet:eip155': {
      accounts: [],
    },
  },
  sessionProperties: {},
  isMultichainOrigin: false,
});

// Returns the CAIP-25 caveat or undefined if it does not exist
export const getCaip25Caveat = (origin: string) => {
  let caip25Caveat;
  try {
    caip25Caveat = Engine.context.PermissionController.getCaveat(
      origin,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
    );
  } catch (err) {
    if (err instanceof PermissionDoesNotExistError) {
      // suppress expected error in case that the origin
      // does not have the target permission yet
    } else {
      throw err;
    }
  }
  return caip25Caveat;
};

export const addPermittedAccounts = (
  origin: string,
  accounts: Hex[],
): string => {
  const caip25Caveat = getCaip25Caveat(origin);
  if (!caip25Caveat) {
    throw new Error(
      `Cannot add account permissions for origin "${origin}": no permission currently exists for this origin.`,
    );
  }

  const ethAccounts = getEthAccounts(caip25Caveat.value);

  const updatedEthAccounts = Array.from(new Set([...ethAccounts, ...accounts]));

  // No change in permitted account addresses
  if (ethAccounts.length === updatedEthAccounts.length) {
    console.error(
      `eth_accounts permission for hostname: (${origin}) already exists for account addresses: (${updatedEthAccounts}).`,
    );

    return ethAccounts[0];
  }

  const updatedCaveatValue = setEthAccounts(
    caip25Caveat.value,
    updatedEthAccounts,
  );

  Engine.context.PermissionController.updateCaveat(
    origin,
    Caip25EndowmentPermissionName,
    Caip25CaveatType,
    updatedCaveatValue,
  );

  return updatedEthAccounts[0];
};

export const removePermittedAccounts = (origin: string, accounts: Hex[]) => {
  const { PermissionController } = Engine.context;

  const caip25Caveat = getCaip25Caveat(origin);
  if (!caip25Caveat) {
    throw new Error(
      `Cannot remove accounts "${accounts}": No permissions exist for origin "${origin}".`,
    );
  }

  const existingAccounts = getEthAccounts(caip25Caveat.value);

  const remainingAccounts = existingAccounts.filter(
    (existingAccount) => !accounts.includes(existingAccount),
  );

  if (remainingAccounts.length === existingAccounts.length) {
    return;
  }

  if (remainingAccounts.length === 0) {
    PermissionController.revokePermission(
      origin,
      Caip25EndowmentPermissionName,
    );
  } else {
    const updatedCaveatValue = setEthAccounts(
      caip25Caveat.value,
      remainingAccounts,
    );
    PermissionController.updateCaveat(
      origin,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
      updatedCaveatValue,
    );
  }
};

export const removeAccountsFromPermissions = async (addresses: Hex[]) => {
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

export const addPermittedChains = (
  origin: string,
  chainIds: Hex[],
  shouldRemoveExistingChainPermissions = false,
) => {
  const caip25Caveat = getCaip25Caveat(origin);
  if (!caip25Caveat) {
    throw new Error(
      `Cannot add chain permissions for origin "${origin}": no permission currently exists for this origin.`,
    );
  }

  const additionalChainIds = shouldRemoveExistingChainPermissions
    ? []
    : getPermittedEthChainIds(caip25Caveat.value);

  const updatedEthChainIds = Array.from(
    new Set([...additionalChainIds, ...chainIds]),
  );

  const caveatValueWithChains = setPermittedEthChainIds(
    caip25Caveat.value,
    updatedEthChainIds,
  );

  // ensure that the list of permitted eth accounts is set for the newly added eth scopes
  const ethAccounts = getEthAccounts(caveatValueWithChains);
  const caveatValueWithAccountsSynced = setEthAccounts(
    caveatValueWithChains,
    ethAccounts,
  );

  Engine.context.PermissionController.updateCaveat(
    origin,
    Caip25EndowmentPermissionName,
    Caip25CaveatType,
    caveatValueWithAccountsSynced,
  );
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
 * @returns {string[]} The origin's permitted accounts, or an empty
 * array.
 */
export const getPermittedAccounts = (
  origin: string,
  { ignoreLock }: { ignoreLock?: boolean } = {},
) => {
  const { AccountsController, PermissionController, KeyringController } =
    Engine.context;

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

/**
 * Get permitted chains for the given the host.
 *
 * @param hostname - Subject to check if permissions exists. Ex: A Dapp is a subject.
 * @returns An array containing permitted chains for the specified host.
 */
export const getPermittedChains = async (
  hostname: string,
): Promise<CaipChainId[]> => {
  const { PermissionController } = Engine.context;
  const caveat = PermissionController.getCaveat(
    hostname,
    Caip25EndowmentPermissionName,
  );

  if (caveat) {
    const chains = getPermittedEthChainIds(caveat.value).map(
      (chainId: string) =>
        `${KnownCaipNamespace.Eip155.toString()}:${parseInt(
          chainId,
        )}` as CaipChainId,
    );

    return chains;
  }

  return [];
};
