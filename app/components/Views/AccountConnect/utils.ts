import { Hex } from '@metamask/utils';
import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  setEthAccounts,
  setPermittedEthChainIds,
} from '@metamask/chain-agnostic-permission';

/**
 * Takes in an incoming value and attempts to return the {@link Caip25CaveatValue}.
 *
 * @param permissions - The value to extract Caip25CaveatValue from, expected to be a {@link PermissionsRequest}
 * @returns The {@link Caip25CaveatValue}.
 */
export function getRequestedCaip25CaveatValue(
  permissions: unknown,
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

  return caveatValue as Caip25CaveatValue;
}

/**
 * Modifies the requested CAIP-25 permissions object after UI confirmation.
 *
 * @param caip25CaveatValue - The requested CAIP-25 caveat value to modify.
 * @param ethAccountAddresses - The list of permitted eth addresses.
 * @param ethChainIds - The list of permitted eth chainIds.
 */
export function getCaip25PermissionsResponse(
  caip25CaveatValue: Caip25CaveatValue,
  ethAccountAddresses: Hex[],
  ethChainIds: Hex[],
): {
  [Caip25EndowmentPermissionName]: {
    caveats: [{ type: string; value: Caip25CaveatValue }];
  };
} {
  const caveatValueWithChains = setPermittedEthChainIds(
    caip25CaveatValue,
    ethChainIds,
  );

  const caveatValueWithAccounts = setEthAccounts(
    caveatValueWithChains,
    ethAccountAddresses,
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
