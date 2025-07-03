import ImportedEngine from '../Engine';
import Logger from '../../util/Logger';
import TransactionTypes from '../TransactionTypes';
<<<<<<< HEAD
import {
  CaipAccountId,
  CaipChainId,
  Hex,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
=======
import { CaipChainId, Hex, KnownCaipNamespace } from '@metamask/utils';
>>>>>>> stable
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
<<<<<<< HEAD
  getAllScopesFromCaip25CaveatValue,
  getCaipAccountIdsFromCaip25CaveatValue,
  getEthAccounts,
  getPermittedEthChainIds,
  isInternalAccountInPermittedAccountIds,
  setChainIdsInCaip25CaveatValue,
  setNonSCACaipAccountIdsInCaip25CaveatValue,
=======
  getEthAccounts,
  getPermittedEthChainIds,
  setEthAccounts,
  setPermittedEthChainIds,
>>>>>>> stable
} from '@metamask/chain-agnostic-permission';
import {
  CaveatConstraint,
  PermissionDoesNotExistError,
} from '@metamask/permission-controller';
import { captureException } from '@sentry/react-native';
<<<<<<< HEAD
import { getNetworkConfigurationsByCaipChainId } from '../../selectors/networkController';
import { areAddressesEqual } from '../../util/address';
=======
import { toHex } from '@metamask/controller-utils';
import { toFormattedAddress, areAddressesEqual } from '../../util/address';
>>>>>>> stable

const INTERNAL_ORIGINS = [process.env.MM_FOX_CODE, TransactionTypes.MMM];

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Engine = ImportedEngine as any;

/**
 * Checks that all accounts referenced have a matching InternalAccount. Sends
 * an error to sentry for any accounts that were expected but are missing from the wallet.
 *
 * @param [internalAccounts] - The list of evm accounts the wallet knows about.
<<<<<<< HEAD
 * @param [accounts] - The list of accounts addresses that should exist.
 */
const captureKeyringTypesWithMissingIdentities = (
  internalAccounts: InternalAccount[] = [],
  accounts: string[] = [],
=======
 * @param [accounts] - The list of evm accounts addresses that should exist.
 */
const captureKeyringTypesWithMissingIdentities = (
  internalAccounts: InternalAccount[] = [],
  accounts: Hex[] = [],
>>>>>>> stable
) => {
  const accountsMissingIdentities = accounts.filter(
    (address) =>
      !internalAccounts.some((account) =>
        areAddressesEqual(account.address, address),
      ),
<<<<<<< HEAD
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
 * Sorts a list of addresses by most recently selected by using the lastSelected value for
 * the matching InternalAccount object from the list of internalAccounts provided.
 */
const sortAddressesWithInternalAccounts = <T extends string>(
  addresses: T[],
  internalAccounts: InternalAccount[],
): T[] =>
  [...addresses].sort((firstAddress, secondAddress) => {
    const firstAccount = internalAccounts.find((internalAccount) =>
      areAddressesEqual(internalAccount.address, firstAddress),
    );

    const secondAccount = internalAccounts.find((internalAccount) =>
      areAddressesEqual(internalAccount.address, secondAddress),
    );

    if (!firstAccount) {
      captureKeyringTypesWithMissingIdentities(internalAccounts, addresses);
      throw new Error(`Missing identity for address: "${firstAddress}".`);
    } else if (!secondAccount) {
      captureKeyringTypesWithMissingIdentities(internalAccounts, addresses);
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

/**
 * Sorts a list of evm account addresses by most recently selected by using
 * the lastSelected value for the matching InternalAccount object stored in state.
 */
export const sortEvmAccountsByLastSelected = (addresses: Hex[]): Hex[] => {
  const internalAccounts = Engine.context.AccountsController.listAccounts();
  return sortAddressesWithInternalAccounts(addresses, internalAccounts);
};

/**
 * Sorts a list of caip account id by most recently selected by using the lastSelected value for
 * the matching InternalAccount object from the list of internalAccounts provided.
 */
const sortCaipAccountIdsWithInternalAccounts = (
  caipAccountIds: CaipAccountId[],
  internalAccounts: InternalAccount[],
): CaipAccountId[] =>
  [...caipAccountIds].sort((firstAccountId, secondAccountId) => {
    const firstAccount = internalAccounts.find((internalAccount) =>
      isInternalAccountInPermittedAccountIds(internalAccount, [firstAccountId]),
    );

    const secondAccount = internalAccounts.find((internalAccount) =>
      isInternalAccountInPermittedAccountIds(internalAccount, [
        secondAccountId,
      ]),
    );

    if (!firstAccount) {
      captureKeyringTypesWithMissingIdentities(
        internalAccounts,
        caipAccountIds,
      );
      throw new Error(`Missing identity for address: "${firstAccountId}".`);
    } else if (!secondAccount) {
      captureKeyringTypesWithMissingIdentities(
        internalAccounts,
        caipAccountIds,
      );
      throw new Error(`Missing identity for address: "${secondAccountId}".`);
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

/**
 * Sorts a list of multichain account ids by most recently selected by using
 * the lastSelected value for the matching InternalAccount object stored in state.
 */
export const sortMultichainAccountsByLastSelected = (
  caipAccountIds: CaipAccountId[],
) => {
  const internalAccounts =
    Engine.context.AccountsController.listMultichainAccounts();
  return sortCaipAccountIdsWithInternalAccounts(
    caipAccountIds,
    internalAccounts,
  );
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCaipAccountIdsFromSubject(subject: any) {
  const caveats = subject.permissions?.[Caip25EndowmentPermissionName]?.caveats;
  if (!caveats) {
    return [];
  }

  const caveat = caveats.find(
    ({ type }: CaveatConstraint) => type === Caip25CaveatType,
  );
  if (caveat) {
    return getCaipAccountIdsFromCaip25CaveatValue(caveat.value);
  }

  return [];
}

export const getPermittedCaipAccountIdsByHostname = (
=======
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
    const firstAccount = internalAccounts.find((internalAccount) =>
      areAddressesEqual(internalAccount.address, firstAddress),
    );

    const secondAccount = internalAccounts.find((internalAccount) =>
      areAddressesEqual(internalAccount.address, secondAddress),
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
  const caveats = subject.permissions?.[Caip25EndowmentPermissionName]?.caveats;
  if (!caveats) {
    return [];
  }

  const caveat = caveats.find(
    ({ type }: CaveatConstraint) => type === Caip25CaveatType,
  );
  if (caveat) {
    const ethAccounts = getEthAccounts(caveat.value);
    const formattedEthAccounts = ethAccounts.map((address: string) =>
      toHex(toFormattedAddress(address)),
    );
    return sortAccountsByLastSelected(formattedEthAccounts);
  }

  return [];
}

export const getPermittedAccountsByHostname = (
>>>>>>> stable
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any,
  hostname: string,
<<<<<<< HEAD
): CaipAccountId[] => {
  const { subjects } = state;
  const subject = subjects[hostname];
  return subject ? getCaipAccountIdsFromSubject(subject) : [];
=======
): string[] => {
  const { subjects } = state;
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
>>>>>>> stable
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
<<<<<<< HEAD
function getEvmAddessesFromSubject(subject: any) {
=======
function getPermittedChainIdsFromSubject(subject: any) {
>>>>>>> stable
  const caveats = subject.permissions?.[Caip25EndowmentPermissionName]?.caveats;
  if (!caveats) {
    return [];
  }

  const caveat = caveats.find(
    ({ type }: CaveatConstraint) => type === Caip25CaveatType,
  );
  if (caveat) {
<<<<<<< HEAD
    const ethAccounts = getEthAccounts(caveat.value);
    return sortEvmAccountsByLastSelected(ethAccounts);
=======
    return getPermittedEthChainIds(caveat.value);
>>>>>>> stable
  }

  return [];
}

<<<<<<< HEAD
export const getPermittedEvmAddressesByHostname = (
=======
export const getPermittedChainIdsByHostname = (
>>>>>>> stable
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any,
  hostname: string,
<<<<<<< HEAD
): Hex[] => {
  const { subjects } = state;
  const subject = subjects[hostname];
  return subject ? getEvmAddessesFromSubject(subject) : [];
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPermittedScopesFromSubject(subject: any) {
  const caveats = subject.permissions?.[Caip25EndowmentPermissionName]?.caveats;
  if (!caveats) {
    return [];
  }

  const caveat = caveats.find(
    ({ type }: CaveatConstraint) => type === Caip25CaveatType,
  );
  if (caveat) {
    return getAllScopesFromCaip25CaveatValue(caveat.value);
  }

  return [];
}

export const getPermittedCaipChainIdsByHostname = (
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any,
  hostname: string,
): CaipChainId[] => {
  const { subjects } = state;
  const subject = subjects[hostname];
  if (!subject) {
    return [];
  }
  const permittedScopes = getPermittedScopesFromSubject(subject);
  // our `endowment:caip25` permission can include a special class of `wallet` scopes,
  // see https://github.com/ChainAgnostic/namespaces/tree/main/wallet &
  // https://github.com/ChainAgnostic/namespaces/blob/main/wallet/caip2.md
  // amongs the other chainId scopes. We want to exclude the `wallet` scopes here.
  return permittedScopes.filter((caipChainId: CaipChainId) => {
    try {
      const { namespace } = parseCaipChainId(caipChainId);
      return namespace !== KnownCaipNamespace.Wallet;
    } catch (err) {
      return false;
    }
  });
=======
): string[] => {
  const { subjects } = state;
  const chainIdsByHostname = Object.keys(subjects).reduce(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: any, subjectKey) => {
      const chainIds = getPermittedChainIdsFromSubject(subjects[subjectKey]);
      if (chainIds.length > 0) {
        acc[subjectKey] = chainIds;
      }
      return acc;
    },
    {},
  );

  return chainIdsByHostname?.[hostname] || [];
>>>>>>> stable
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
<<<<<<< HEAD
  accounts: CaipAccountId[],
) => {
=======
  accounts: Hex[],
): string => {
>>>>>>> stable
  const caip25Caveat = getCaip25Caveat(origin);
  if (!caip25Caveat) {
    throw new Error(
      `Cannot add account permissions for origin "${origin}": no permission currently exists for this origin.`,
    );
  }

<<<<<<< HEAD
  const existingPermittedAccountIds = getCaipAccountIdsFromCaip25CaveatValue(
    caip25Caveat.value,
  );

  const existingPermittedChainIds = getAllScopesFromCaip25CaveatValue(
    caip25Caveat.value,
  );

  const updatedAccountIds = Array.from(
    new Set([...existingPermittedAccountIds, ...accounts]),
  );

  let updatedPermittedChainIds = [...existingPermittedChainIds];

  const evmNetworkConfigurationsByChainId =
    Engine.context.NetworkController.state.networkConfigurationsByChainId;
  const nonEvmNetworkConfigurationsByChainId =
    Engine.context.MultichainNetworkController.state
      .multichainNetworkConfigurationsByChainId;
  const networkConfigurations = getNetworkConfigurationsByCaipChainId(
    evmNetworkConfigurationsByChainId,
    nonEvmNetworkConfigurationsByChainId,
  );
  const allNetworksList = Object.keys(networkConfigurations) as CaipChainId[];

  updatedAccountIds.forEach((caipAccountAddress) => {
    const {
      chain: { namespace: accountNamespace },
    } = parseCaipAccountId(caipAccountAddress);

    const existsSelectedChainForNamespace = updatedPermittedChainIds.some(
      (caipChainId) => {
        try {
          const { namespace: chainNamespace } = parseCaipChainId(caipChainId);
          return accountNamespace === chainNamespace;
        } catch (err) {
          return false;
        }
      },
    );

    if (!existsSelectedChainForNamespace) {
      const chainIdsForNamespace = allNetworksList.filter((caipChainId) => {
        try {
          const { namespace: chainNamespace } = parseCaipChainId(caipChainId);
          return accountNamespace === chainNamespace;
        } catch (err) {
          return false;
        }
      });

      updatedPermittedChainIds = [
        ...updatedPermittedChainIds,
        ...chainIdsForNamespace,
      ];
    }
  });

  const updatedCaveatValueWithChainIds = setChainIdsInCaip25CaveatValue(
    caip25Caveat.value,
    updatedPermittedChainIds,
  );

  const updatedCaveatValueWithAccountIds =
    setNonSCACaipAccountIdsInCaip25CaveatValue(
      updatedCaveatValueWithChainIds,
      updatedAccountIds,
    );

=======
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

>>>>>>> stable
  Engine.context.PermissionController.updateCaveat(
    origin,
    Caip25EndowmentPermissionName,
    Caip25CaveatType,
<<<<<<< HEAD
    updatedCaveatValueWithAccountIds,
  );
};

export const removePermittedAccounts = (
  origin: string,
  addresses: string[],
) => {
  const { PermissionController, AccountsController } = Engine.context;
=======
    updatedCaveatValue,
  );

  return updatedEthAccounts[0];
};

export const removePermittedAccounts = (origin: string, accounts: Hex[]) => {
  const { PermissionController } = Engine.context;
>>>>>>> stable

  const caip25Caveat = getCaip25Caveat(origin);
  if (!caip25Caveat) {
    throw new Error(
<<<<<<< HEAD
      `Cannot remove accounts "${addresses}": No permissions exist for origin "${origin}".`,
    );
  }

  const internalAccounts = addresses.map((address) =>
    AccountsController.getAccountByAddress(address),
  ) as InternalAccount[];

  const existingCaipAccountIds = getCaipAccountIdsFromCaip25CaveatValue(
    caip25Caveat.value,
  );

  const remainingAccountIds = existingCaipAccountIds.filter(
    (existingCaipAccountId) =>
      !internalAccounts.some((internalAccount) =>
        isInternalAccountInPermittedAccountIds(internalAccount, [
          existingCaipAccountId,
        ]),
      ),
  );

  if (remainingAccountIds.length === existingCaipAccountIds.length) {
    return;
  }

  if (remainingAccountIds.length === 0) {
=======
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
>>>>>>> stable
    PermissionController.revokePermission(
      origin,
      Caip25EndowmentPermissionName,
    );
  } else {
<<<<<<< HEAD
    const updatedCaveatValue = setNonSCACaipAccountIdsInCaip25CaveatValue(
      caip25Caveat.value,
      remainingAccountIds,
    );
    PermissionController.updateCaveat(
      origin,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
      updatedCaveatValue,
=======
    const updatedCaveatValue = setEthAccounts(
      caip25Caveat.value,
      remainingAccounts,
>>>>>>> stable
    );
    PermissionController.updateCaveat(
      origin,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
      updatedCaveatValue,
    );
  }
};

<<<<<<< HEAD
// The codebase needs to be refactored to use caipAccountIds so that this is easier to change
=======
>>>>>>> stable
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

export const updatePermittedChains = (
  origin: string,
<<<<<<< HEAD
  chainIds: CaipChainId[],
  shouldReplaceExistingChainPermissions = false,
=======
  chainIds: Hex[],
  shouldRemoveExistingChainPermissions = false,
>>>>>>> stable
) => {
  const caip25Caveat = getCaip25Caveat(origin);
  if (!caip25Caveat) {
    throw new Error(
      `Cannot add chain permissions for origin "${origin}": no permission currently exists for this origin.`,
    );
  }

<<<<<<< HEAD
  const additionalChainIds = shouldReplaceExistingChainPermissions
    ? []
    : getAllScopesFromCaip25CaveatValue(caip25Caveat.value);

  const updatedChainIds = Array.from(
    new Set([...additionalChainIds, ...chainIds]),
  );

  const caveatValueWithChainIds = setChainIdsInCaip25CaveatValue(
    caip25Caveat.value,
    updatedChainIds,
  );

  const permittedAccountIds = getCaipAccountIdsFromCaip25CaveatValue(
    caip25Caveat.value,
  );

  // ensure that the list of permitted accounts is set for the newly added scopes
  const caveatValueWithAccountsSynced =
    setNonSCACaipAccountIdsInCaip25CaveatValue(
      caveatValueWithChainIds,
      permittedAccountIds,
    );

=======
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

>>>>>>> stable
  Engine.context.PermissionController.updateCaveat(
    origin,
    Caip25EndowmentPermissionName,
    Caip25CaveatType,
    caveatValueWithAccountsSynced,
  );
};

/**
 * Remove a permitted chain for the given the host.
 *
 * @param hostname - Subject to remove permitted chain. Ex: A Dapp is a subject
 * @param chainId - ChainId to remove.
 */
<<<<<<< HEAD
export const removePermittedChain = (
  hostname: string,
  chainId: CaipChainId,
) => {
=======
export const removePermittedChain = (hostname: string, chainId: string) => {
>>>>>>> stable
  const caip25Caveat = getCaip25Caveat(hostname);
  if (!caip25Caveat) {
    throw new Error(
      `Cannot remove chain permissions for origin "${hostname}": no permission currently exists for this origin.`,
    );
  }
  const { PermissionController } = Engine.context;
  const caveat = PermissionController.getCaveat(
    hostname,
    Caip25EndowmentPermissionName,
    Caip25CaveatType,
  );

<<<<<<< HEAD
  const permittedChainIds = getAllScopesFromCaip25CaveatValue(caveat.value);
  const newPermittedChains = permittedChainIds.filter(
    (chain: string) => chain !== chainId,
  );
  if (newPermittedChains.length === permittedChainIds.length) {
    return;
  } else if (newPermittedChains.length === 0) {
    PermissionController.revokePermission(
      hostname,
      Caip25EndowmentPermissionName,
    );
  } else {
    updatePermittedChains(hostname, newPermittedChains, true);
  }
=======
  const permittedChainIds = getPermittedEthChainIds(caveat);
  const newPermittedChains = permittedChainIds.filter(
    (chain: string) => chain !== chainId,
  );
  updatePermittedChains(hostname, newPermittedChains, true);
>>>>>>> stable
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
<<<<<<< HEAD
  return sortEvmAccountsByLastSelected(ethAccounts);
=======
  return sortAccountsByLastSelected(ethAccounts);
>>>>>>> stable
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
    Caip25CaveatType,
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
