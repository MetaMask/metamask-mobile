import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { ensureValidState } from './util';
import {
  hasProperty,
  hexToBigInt,
  isObject,
  type CaipChainId,
  type CaipAccountId,
  type Json,
  type Hex,
  type NonEmptyArray,
} from '@metamask/utils';
import type {
  Caveat,
  PermissionConstraint,
  ValidPermission,
} from '@metamask/permission-controller';

// In-lined from @metamask/multichain
const Caip25CaveatType = 'authorizedScopes';
const Caip25EndowmentPermissionName = 'endowment:caip25';

interface InternalScopeObject {
  accounts: CaipAccountId[];
}

type InternalScopesObject = Record<CaipChainId, InternalScopeObject>;

interface Caip25CaveatValue {
  requiredScopes: InternalScopesObject;
  optionalScopes: InternalScopesObject;
  sessionProperties?: Record<string, Json>;
  isMultichainOrigin: boolean;
}

// Locally defined types
type Caip25Caveat = Caveat<typeof Caip25CaveatType, Caip25CaveatValue>;
type Caip25Permission = ValidPermission<
  typeof Caip25EndowmentPermissionName,
  Caip25Caveat
>;

const PermissionNames = {
  eth_accounts: 'eth_accounts',
  permittedChains: 'endowment:permitted-chains',
} as const;

// a map of the networks built into the extension at the time of this migration to their chain IDs
// copied from shared/constants/network.ts (https://github.com/MetaMask/metamask-extension/blob/5b5c04a16fb7937a6e9d59b1debe4713978ef39d/shared/constants/network.ts#L535)
const BUILT_IN_NETWORKS: ReadonlyMap<string, Hex> = new Map([
  ['sepolia', '0xaa36a7'],
  ['mainnet', '0x1'],
  ['linea-sepolia', '0xe705'],
  ['linea-mainnet', '0xe708'],
]);

const snapsPrefixes = ['npm:', 'local:'] as const;

function isPermissionConstraint(obj: unknown): obj is PermissionConstraint {
  return (
    isObject(obj) &&
    obj !== null &&
    hasProperty(obj, 'caveats') &&
    Array.isArray(obj.caveats) &&
    obj.caveats.length > 0 &&
    hasProperty(obj, 'date') &&
    typeof obj.date === 'number' &&
    hasProperty(obj, 'id') &&
    typeof obj.id === 'string' &&
    hasProperty(obj, 'invoker') &&
    typeof obj.invoker === 'string' &&
    hasProperty(obj, 'parentCapability') &&
    typeof obj.parentCapability === 'string'
  );
}

function isNonEmptyArrayOfStrings(obj: unknown): obj is NonEmptyArray<string> {
  return (
    Array.isArray(obj) &&
    obj.length > 0 &&
    obj.every((item) => typeof item === 'string')
  );
}

/**
 * TODO: Update this
 * @param state - The current MetaMask extension state.
 * @returns Migrated Redux state.
 */
export default function migrate(oldState: unknown) {
  const version = 72;

  // Ensure the state is valid for migration
  if (!ensureValidState(oldState, version)) {
    return oldState;
  }

  const newState = cloneDeep(oldState);
  const { backgroundState } = newState.engine;

  if (!hasProperty(backgroundState, 'PermissionController')) {
    return oldState;
  }

  if (!isObject(backgroundState.PermissionController)) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.PermissionController is ${typeof backgroundState.PermissionController}`,
      ),
    );
    return oldState;
  }

  if (
    !hasProperty(backgroundState, 'NetworkController') ||
    !isObject(backgroundState.NetworkController)
  ) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.NetworkController is ${typeof backgroundState.NetworkController}`,
      ),
    );
    return oldState;
  }

  if (!hasProperty(backgroundState, 'SelectedNetworkController')) {
    console.warn(
      `Migration ${version}: typeof state.SelectedNetworkController is ${typeof backgroundState.SelectedNetworkController}`,
    );
    // This matches how the `SelectedNetworkController` is initialized
    // See https://github.com/MetaMask/core/blob/e692641040be470f7f4ad2d58692b0668e6443b3/packages/selected-network-controller/src/SelectedNetworkController.ts#L27
    backgroundState.SelectedNetworkController = {
      domains: {},
    };
  }

  if (!isObject(backgroundState.SelectedNetworkController)) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.SelectedNetworkController is ${typeof backgroundState.SelectedNetworkController}`,
      ),
    );
    return oldState;
  }

  const {
    NetworkController: {
      selectedNetworkClientId,
      networkConfigurationsByChainId,
    },
    PermissionController: { subjects },
  } = backgroundState;

  if (!isObject(subjects)) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.PermissionController.subjects is ${typeof subjects}`,
      ),
    );
    return oldState;
  }

  if (!selectedNetworkClientId || typeof selectedNetworkClientId !== 'string') {
    captureException(
      new Error(
        `Migration ${version}: typeof state.NetworkController.selectedNetworkClientId is ${typeof selectedNetworkClientId}`,
      ),
    );
    return oldState;
  }

  if (!isObject(networkConfigurationsByChainId)) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId is ${typeof backgroundState
          .NetworkController.networkConfigurationsByChainId}`,
      ),
    );
    return oldState;
  }

  if (
    !hasProperty(backgroundState.SelectedNetworkController, 'domains') ||
    !isObject(backgroundState.SelectedNetworkController.domains)
  ) {
    const { domains } = backgroundState.SelectedNetworkController;
    captureException(
      new Error(
        `Migration ${version}: typeof state.SelectedNetworkController.domains is ${typeof domains}`,
      ),
    );
    return oldState;
  }

  const { domains } = backgroundState.SelectedNetworkController;

  const getChainIdForNetworkClientId = (
    networkClientId: string,
    propertyName: string,
  ): string | undefined => {
    let malformedDataErrorFound = false;
    let matchingChainId: string | undefined;
    for (const [chainId, networkConfiguration] of Object.entries(
      networkConfigurationsByChainId,
    )) {
      if (!isObject(networkConfiguration)) {
        captureException(
          new Error(
            `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId["${chainId}"] is ${typeof networkConfiguration}`,
          ),
        );
        malformedDataErrorFound = true;
        continue;
      }
      if (!Array.isArray(networkConfiguration.rpcEndpoints)) {
        captureException(
          new Error(
            `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId["${chainId}"].rpcEndpoints is ${typeof networkConfiguration.rpcEndpoints}`,
          ),
        );
        malformedDataErrorFound = true;
        continue;
      }

      for (const rpcEndpoint of networkConfiguration.rpcEndpoints) {
        if (!isObject(rpcEndpoint)) {
          captureException(
            new Error(
              `Migration ${version}: typeof state.NetworkController.networkConfigurationsByChainId["${chainId}"].rpcEndpoints[] is ${typeof rpcEndpoint}`,
            ),
          );
          malformedDataErrorFound = true;
          continue;
        }

        if (rpcEndpoint.networkClientId === networkClientId) {
          matchingChainId = chainId;
        }
      }
    }
    if (malformedDataErrorFound) {
      return undefined;
    }

    if (matchingChainId) {
      return matchingChainId;
    }

    const builtInChainId = BUILT_IN_NETWORKS.get(networkClientId);
    if (!builtInChainId) {
      captureException(
        new Error(
          `Migration ${version}: No chainId found for ${propertyName} "${networkClientId}"`,
        ),
      );
    }
    return builtInChainId;
  };

  const currentChainId = getChainIdForNetworkClientId(
    selectedNetworkClientId,
    'selectedNetworkClientId',
  );
  if (!currentChainId) {
    return oldState;
  }

  // perform mutations on the cloned state
  for (const [origin, subject] of Object.entries(subjects)) {
    if (!isObject(subject)) {
      captureException(
        new Error(
          `Migration ${version}: Invalid subject for origin "${origin}" of type ${typeof subject}`,
        ),
      );
      return oldState;
    }

    if (
      !hasProperty(subject, 'permissions') ||
      !isObject(subject.permissions)
    ) {
      captureException(
        new Error(
          `Migration ${version}: Invalid permissions for origin "${origin}" of type ${typeof subject.permissions}`,
        ),
      );
      return oldState;
    }

    const { permissions } = subject;

    let basePermission: PermissionConstraint | undefined;

    let ethAccounts: string[] = [];
    const ethAccountsPermission = permissions[PermissionNames.eth_accounts];
    const permittedChainsPermission =
      permissions[PermissionNames.permittedChains];

    // if there is no eth_accounts permission we can't create a valid CAIP-25 permission so
    // we remove the permitted-chains permission if present and then continue
    if (!ethAccountsPermission) {
      delete permissions[PermissionNames.permittedChains];
      continue;
    }
    if (!isPermissionConstraint(ethAccountsPermission)) {
      captureException(
        new Error(
          `Migration ${version}: Invalid state.PermissionController.subjects[${origin}].permissions[${
            PermissionNames.eth_accounts
          }]: ${JSON.stringify(ethAccountsPermission)}`,
        ),
      );
      return oldState;
    }
    const accountsCaveatValue = ethAccountsPermission.caveats?.[0]?.value;
    if (!isNonEmptyArrayOfStrings(accountsCaveatValue)) {
      captureException(
        new Error(
          `Migration ${version}: Invalid state.PermissionController.subjects[${origin}].permissions[${
            PermissionNames.eth_accounts
          }].caveats[0].value of type ${typeof ethAccountsPermission
            .caveats?.[0]?.value}`,
        ),
      );
      return oldState;
    }
    ethAccounts = accountsCaveatValue;
    basePermission = ethAccountsPermission;

    delete permissions[PermissionNames.eth_accounts];

    let chainIds: string[] = [];
    // this permission is new so it may not exist
    if (permittedChainsPermission) {
      if (!isPermissionConstraint(permittedChainsPermission)) {
        captureException(
          new Error(
            `Migration ${version}: Invalid state.PermissionController.subjects[${origin}].permissions[${
              PermissionNames.permittedChains
            }]: ${JSON.stringify(permittedChainsPermission)}`,
          ),
        );
        return oldState;
      }
      const chainsCaveatValue = permittedChainsPermission.caveats?.[0]?.value;
      if (!isNonEmptyArrayOfStrings(chainsCaveatValue)) {
        captureException(
          new Error(
            `Migration ${version}: Invalid state.PermissionController.subjects[${origin}].permissions[${
              PermissionNames.permittedChains
            }].caveats[0].value of type ${typeof permittedChainsPermission
              .caveats?.[0]?.value}`,
          ),
        );
        return oldState;
      }
      chainIds = chainsCaveatValue;
      basePermission ??= permittedChainsPermission;
      delete permissions[PermissionNames.permittedChains];
    }

    if (chainIds.length === 0) {
      chainIds = [currentChainId];

      const networkClientIdForOrigin = domains[origin];
      if (
        networkClientIdForOrigin &&
        typeof networkClientIdForOrigin === 'string'
      ) {
        const chainIdForOrigin = getChainIdForNetworkClientId(
          networkClientIdForOrigin,
          'networkClientIdForOrigin',
        );
        if (chainIdForOrigin) {
          chainIds = [chainIdForOrigin];
        }
      }
    }

    const isSnap = snapsPrefixes.some((prefix) => origin.startsWith(prefix));
    const scopes: InternalScopesObject = {};
    const scopeStrings: CaipChainId[] = isSnap
      ? []
      : chainIds.map<CaipChainId>(
          (chainId) => `eip155:${hexToBigInt(chainId).toString(10)}`,
        );
    scopeStrings.push('wallet:eip155');

    scopeStrings.forEach((scopeString) => {
      const caipAccounts = ethAccounts.map<CaipAccountId>(
        (account) => `${scopeString}:${account}`,
      );
      scopes[scopeString] = {
        accounts: caipAccounts,
      };
    });

    const caip25Permission: Caip25Permission = {
      ...basePermission,
      parentCapability: Caip25EndowmentPermissionName,
      caveats: [
        {
          type: Caip25CaveatType,
          value: {
            requiredScopes: {},
            optionalScopes: scopes,
            isMultichainOrigin: false,
          },
        },
      ],
    };

    permissions[Caip25EndowmentPermissionName] = caip25Permission;
  }

  return newState;
}
