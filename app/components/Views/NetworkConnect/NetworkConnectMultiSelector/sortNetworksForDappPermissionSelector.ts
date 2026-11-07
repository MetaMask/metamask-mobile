import {
  CaipChainId,
  CaipNamespace,
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import { TESTNET_CAIP_IDS } from '../../../../constants/network';

export interface NetworkForDappPermissionSort {
  caipChainId: CaipChainId;
  name: string;
}

export interface SortNetworksForDappPermissionSelectorOptions {
  /**
   * Currently selected / default-selected chain IDs. Used for within-tier
   * ordering and as the namespace seed when request scopes are absent.
   */
  preferredChainIds: CaipChainId[];
  /**
   * Explicitly requested chain IDs from the dapp (when present).
   */
  requestedCaipChainIds?: CaipChainId[];
  /**
   * Explicitly requested CAIP namespaces from the dapp (e.g. eip155 for
   * EIP-1193). Takes precedence over chain-derived namespaces.
   */
  requestedNamespaces?: CaipNamespace[];
}

const isTestNetwork = (caipChainId: CaipChainId): boolean =>
  TESTNET_CAIP_IDS.includes(caipChainId);

const getNamespace = (caipChainId: CaipChainId): CaipNamespace | null => {
  if (!isCaipChainId(caipChainId) || caipChainId.startsWith('wallet:')) {
    return null;
  }
  try {
    const { namespace } = parseCaipChainId(caipChainId);
    return namespace === KnownCaipNamespace.Wallet ? null : namespace;
  } catch {
    return null;
  }
};

const namespacesFromChainIds = (
  chainIds: CaipChainId[],
): Set<CaipNamespace> => {
  const namespaces = new Set<CaipNamespace>();
  chainIds.forEach((chainId) => {
    const namespace = getNamespace(chainId);
    if (namespace) {
      namespaces.add(namespace);
    }
  });
  return namespaces;
};

/**
 * Resolves which CAIP namespaces are "in scope" for a dapp permission list.
 *
 * Precedence: requestedNamespaces → namespaces of requestedCaipChainIds →
 * namespaces of preferredChainIds (Option A for existing connections).
 *
 * @param options - Request and selection context
 * @returns Set of in-scope namespaces
 */
export const getInScopeNamespacesForDappPermissionSelector = ({
  preferredChainIds,
  requestedCaipChainIds = [],
  requestedNamespaces = [],
}: SortNetworksForDappPermissionSelectorOptions): Set<CaipNamespace> => {
  const filteredRequestedNamespaces = requestedNamespaces.filter(
    (namespace) => namespace !== KnownCaipNamespace.Wallet,
  );

  if (filteredRequestedNamespaces.length > 0) {
    return new Set(filteredRequestedNamespaces);
  }

  if (requestedCaipChainIds.length > 0) {
    return namespacesFromChainIds(requestedCaipChainIds);
  }

  return namespacesFromChainIds(preferredChainIds);
};

/**
 * Sorts networks for dapp Edit Permissions:
 * 1. In-scope mainnets (matching request / selected namespaces)
 * 2. Other mainnets
 * 3. Testnets last
 *
 * Within a tier, preferred/selected chain IDs keep their relative order, then
 * remaining networks are sorted alphabetically by name.
 *
 * @param networks - Networks to sort
 * @param options - Request and selection context
 * @returns New sorted array
 */
export const sortNetworksForDappPermissionSelector = <
  T extends NetworkForDappPermissionSort,
>(
  networks: T[],
  options: SortNetworksForDappPermissionSelectorOptions,
): T[] => {
  const inScopeNamespaces =
    getInScopeNamespacesForDappPermissionSelector(options);
  const preferredOrder: CaipChainId[] = [];
  const seenPreferred = new Set<CaipChainId>();
  [
    ...(options.requestedCaipChainIds ?? []),
    ...options.preferredChainIds,
  ].forEach((chainId) => {
    if (!seenPreferred.has(chainId)) {
      seenPreferred.add(chainId);
      preferredOrder.push(chainId);
    }
  });
  const preferredIndex = new Map(
    preferredOrder.map((chainId, index) => [chainId, index]),
  );

  const getTier = (network: T): number => {
    if (isTestNetwork(network.caipChainId)) {
      return 2;
    }
    const namespace = getNamespace(network.caipChainId);
    if (namespace && inScopeNamespaces.has(namespace)) {
      return 0;
    }
    return 1;
  };

  const compareWithinTier = (a: T, b: T): number => {
    const aPreferred = preferredIndex.get(a.caipChainId);
    const bPreferred = preferredIndex.get(b.caipChainId);
    const aIsPreferred = aPreferred !== undefined;
    const bIsPreferred = bPreferred !== undefined;

    if (aIsPreferred && bIsPreferred) {
      return (aPreferred as number) - (bPreferred as number);
    }
    if (aIsPreferred !== bIsPreferred) {
      return aIsPreferred ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  };

  return [...networks].sort((a, b) => {
    const tierDiff = getTier(a) - getTier(b);
    return tierDiff === 0 ? compareWithinTier(a, b) : tierDiff;
  });
};
