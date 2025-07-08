import {
  CaipAccountId,
  CaipChainId,
  CaipNamespace,
  parseCaipAccountId,
} from '@metamask/utils';
import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  getAllScopesFromCaip25CaveatValue,
  getCaipAccountIdsFromCaip25CaveatValue,
  setChainIdsInCaip25CaveatValue,
  setNonSCACaipAccountIdsInCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { InternalAccountWithCaipAccountId } from '../../../selectors/accountsController';
import { getCaip25Caveat } from '../../../core/Permissions';

/**
 * Takes in an incoming value and attempts to return the {@link Caip25CaveatValue}.
 *
 * @param permissions - The value to extract Caip25CaveatValue from, expected to be a {@link PermissionsRequest}
 * @param origin - The origin of the connection.
 * @returns The {@link Caip25CaveatValue}.
 */
export function getRequestedCaip25CaveatValue(
  permissions: unknown,
  origin: string,
): Caip25CaveatValue {
  const defaultValue: Caip25CaveatValue = {
    optionalScopes: {},
    requiredScopes: {},
    isMultichainOrigin: false,
    sessionProperties: {},
  };

  // Type guard: Check if permissions is an object
  if (!permissions || typeof permissions !== 'object') {
    return defaultValue;
  }

  // Type guard: Check if the Caip25EndowmentPermissionName property exists and is an object
  const permissionEntry = (permissions as Record<string, unknown>)[
    Caip25EndowmentPermissionName
  ];
  if (!permissionEntry || typeof permissionEntry !== 'object') {
    return defaultValue;
  }

  // Type guard: Check if caveats property exists and is an array
  const caveats = (permissionEntry as Record<string, unknown>).caveats;
  if (!Array.isArray(caveats)) {
    return defaultValue;
  }

  // Find the caveat with the matching type
  const targetCaveat = caveats.find(
    (caveat) =>
      caveat &&
      typeof caveat === 'object' &&
      'type' in caveat &&
      caveat.type === Caip25CaveatType,
  );

  // Type guard: Check if the caveat has a value property
  if (
    !targetCaveat ||
    typeof targetCaveat !== 'object' ||
    !('value' in targetCaveat)
  ) {
    return defaultValue;
  }

  const caveatValue = targetCaveat.value;

  // Type guard: Ensure the value is an object with the expected shape
  if (
    !caveatValue ||
    typeof caveatValue !== 'object' ||
    !('optionalScopes' in caveatValue) ||
    !('requiredScopes' in caveatValue) ||
    !('isMultichainOrigin' in caveatValue) ||
    !('sessionProperties' in caveatValue)
  ) {
    return defaultValue;
  }

  try {
    const existingCaveat = getCaip25Caveat(origin);

    const mergedCaveatValue = mergeCaip25Values(
      existingCaveat.value,
      caveatValue,
    );

    return mergedCaveatValue;
  } catch (e) {
    return caveatValue as Caip25CaveatValue;
  }
}

/**
 * TODO: Isolate the merger function from @metamask/chain-agnostic-permissions and reuse it here
 * See https://github.com/MetaMask/MetaMask-planning/issues/5113
 *
 * Merges two Caip25CaveatValue objects
 *
 * @param first - The first Caip25CaveatValue to merge
 * @param second - The second Caip25CaveatValue to merge
 * @returns A new Caip25CaveatValue with merged data
 */
function mergeCaip25Values(
  first: Caip25CaveatValue,
  second: Caip25CaveatValue,
): Caip25CaveatValue {
  const firstAccounts = getCaipAccountIdsFromCaip25CaveatValue(first);
  const secondAccounts = getCaipAccountIdsFromCaip25CaveatValue(second);

  const mergedAccounts = Array.from(
    new Set([...firstAccounts, ...secondAccounts]),
  );

  const firstChainIds = getAllScopesFromCaip25CaveatValue(first);
  const secondChainIds = getAllScopesFromCaip25CaveatValue(second);

  const mergedChainIds = Array.from(
    new Set([...firstChainIds, ...secondChainIds]),
  );

  let mergedCaveatValue = { ...first };

  mergedCaveatValue.sessionProperties = {
    ...first.sessionProperties,
    ...second.sessionProperties,
  };

  mergedCaveatValue.isMultichainOrigin =
    first.isMultichainOrigin || second.isMultichainOrigin;

  mergedCaveatValue = setChainIdsInCaip25CaveatValue(
    mergedCaveatValue,
    mergedChainIds,
  );

  mergedCaveatValue = setNonSCACaipAccountIdsInCaip25CaveatValue(
    mergedCaveatValue,
    mergedAccounts,
  );

  return mergedCaveatValue;
}

/**
 * Modifies the requested CAIP-25 permissions object after UI confirmation.
 *
 * @param caip25CaveatValue - The requested CAIP-25 caveat value to modify.
 * @param caipAccountIds - The list of permitted CAIP account IDs.
 * @param caipChainIds - The list of permitted CAIP chain IDs.
 * @returns the CAIP-25 permissions object.
 */
export function getCaip25PermissionsResponse(
  caip25CaveatValue: Caip25CaveatValue,
  caipAccountIds: CaipAccountId[],
  caipChainIds: CaipChainId[],
): {
  [Caip25EndowmentPermissionName]: {
    caveats: [{ type: string; value: Caip25CaveatValue }];
  };
} {
  const caveatValueWithChains = setChainIdsInCaip25CaveatValue(
    caip25CaveatValue,
    caipChainIds,
  );

  const caveatValueWithAccounts = setNonSCACaipAccountIdsInCaip25CaveatValue(
    caveatValueWithChains,
    caipAccountIds,
  );

  return {
    [Caip25EndowmentPermissionName]: {
      caveats: [
        {
          type: Caip25CaveatType,
          value: caveatValueWithAccounts,
        },
      ],
    },
  };
}

/**
 * Sorts a list of InternalAccounts by most recently selected
 *
 * @param internalAccounts - The list of InternalAccounts.
 * @returns the sorted list of InternalAccounts.
 */
export function sortSelectedInternalAccounts(
  internalAccounts: InternalAccountWithCaipAccountId[],
) {
  // This logic comes from the `AccountsController`:
  // TODO: Expose a free function from this controller and use it here
  return [...internalAccounts].sort(
    (accountA, accountB) =>
      // Sort by `.lastSelected` in descending order
      (accountB.metadata.lastSelected ?? 0) -
      (accountA.metadata.lastSelected ?? 0),
  );
}

/**
 * Gets the default accounts for the requested namespaces.
 * We need at least one default per requested namespace
 * if there are more explicitly requested accounts, use those instead
 * for that namespace
 *
 * @param requestedNamespaces - The namespaces requested.
 * @param supportedRequestedAccounts - The supported requested accounts.
 * @param allAccounts - All available accounts.
 * @returns the default accounts.
 */
export function getDefaultAccounts(
  requestedNamespaces: CaipNamespace[],
  supportedRequestedAccounts: InternalAccountWithCaipAccountId[],
  allAccounts: InternalAccountWithCaipAccountId[],
): InternalAccountWithCaipAccountId[] {
  const defaultAccounts: InternalAccountWithCaipAccountId[] = [];
  const satisfiedNamespaces = new Set<CaipNamespace>();

  supportedRequestedAccounts.forEach((account) => {
    const {
      chain: { namespace },
    } = parseCaipAccountId(account.caipAccountId);
    if (requestedNamespaces.includes(namespace)) {
      defaultAccounts.push(account);
      satisfiedNamespaces.add(namespace);
    }
  });

  const unsatisfiedNamespaces = requestedNamespaces.filter(
    (namespace) => !satisfiedNamespaces.has(namespace),
  );

  if (unsatisfiedNamespaces.length > 0) {
    const allAccountsSortedByLastSelected =
      sortSelectedInternalAccounts(allAccounts);

    for (const namespace of unsatisfiedNamespaces) {
      const defaultAccountForNamespace = allAccountsSortedByLastSelected.find(
        (account) => {
          const {
            chain: { namespace: accountNamespace },
          } = parseCaipAccountId(account.caipAccountId);
          return accountNamespace === namespace;
        },
      );

      if (defaultAccountForNamespace) {
        defaultAccounts.push(defaultAccountForNamespace);
      }
    }
  }

  return defaultAccounts;
}
