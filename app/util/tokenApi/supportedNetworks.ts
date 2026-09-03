import { handleFetch, convertHexToDecimal } from '@metamask/controller-utils';
import { parseCaipAssetType, type Hex } from '@metamask/utils';

export const TOKEN_API_SUPPORTED_NETWORKS_URL =
  'https://token.api.cx.metamask.io/v2/supportedNetworks';

const SUPPORTED_NETWORKS_CACHE_TTL_MS = 60 * 60 * 1000;

interface SupportedNetworksResponse {
  fullSupport?: string[];
  partialSupport?: string[];
}

let supportedChainIdsCache: Set<string> | undefined;
let supportedChainIdsCachedAt = 0;
let supportedChainIdsRefreshPromise: Promise<Set<string>> | undefined;

function normalizeSupportedNetworksResponse(
  response: SupportedNetworksResponse,
): Set<string> {
  return new Set([
    ...(response.fullSupport ?? []),
    ...(response.partialSupport ?? []),
  ]);
}

async function refreshSupportedChainIds(now: number): Promise<Set<string>> {
  if (supportedChainIdsRefreshPromise) {
    return supportedChainIdsRefreshPromise;
  }

  supportedChainIdsRefreshPromise = (async () => {
    try {
      const response = (await handleFetch(
        TOKEN_API_SUPPORTED_NETWORKS_URL,
      )) as SupportedNetworksResponse;

      if (
        response &&
        typeof response === 'object' &&
        (Array.isArray(response.fullSupport) ||
          Array.isArray(response.partialSupport))
      ) {
        supportedChainIdsCache = normalizeSupportedNetworksResponse(response);
        supportedChainIdsCachedAt = now;
      }
    } catch {
      // Leave cache unchanged on failure; callers treat missing cache as unsupported.
    } finally {
      supportedChainIdsRefreshPromise = undefined;
    }

    return supportedChainIdsCache ?? new Set();
  })();

  return supportedChainIdsRefreshPromise;
}

/**
 * Returns CAIP chain IDs supported by the Token API (`/v2/supportedNetworks`).
 * Results are cached in memory for one hour.
 */
export async function getTokenApiSupportedChainIds(): Promise<Set<string>> {
  const now = Date.now();
  if (
    supportedChainIdsCache &&
    now - supportedChainIdsCachedAt < SUPPORTED_NETWORKS_CACHE_TTL_MS
  ) {
    return supportedChainIdsCache;
  }

  return refreshSupportedChainIds(now);
}

export function hexChainIdToCaipChainId(chainId: Hex | string): string {
  const normalized = chainId.startsWith('0x')
    ? chainId
    : (`0x${chainId}` as Hex);
  return `eip155:${convertHexToDecimal(normalized)}`;
}

/**
 * Whether the Token API supports token-list / asset requests for `chainId`.
 * Returns `false` when the network is absent from `/v2/supportedNetworks`.
 */
export async function isTokenApiChainSupported(
  chainId: Hex | string,
): Promise<boolean> {
  const supportedChainIds = await getTokenApiSupportedChainIds();
  return supportedChainIds.has(hexChainIdToCaipChainId(chainId));
}

function getCaipChainIdFromAssetId(assetId: string): string | null {
  try {
    const { chain } = parseCaipAssetType(assetId);
    return `${chain.namespace}:${chain.reference}`;
  } catch {
    return null;
  }
}

/**
 * Filters CAIP-19 asset IDs to those on Token API supported networks.
 */
export async function filterTokenApiSupportedCaipAssetIds(
  assetIds: readonly string[],
): Promise<string[]> {
  if (assetIds.length === 0) {
    return [];
  }

  const supportedChainIds = await getTokenApiSupportedChainIds();
  return assetIds.filter((assetId) => {
    const chainId = getCaipChainIdFromAssetId(assetId);
    return chainId != null && supportedChainIds.has(chainId);
  });
}

/** Clears the in-memory supported-networks cache. For unit tests only. */
export function resetTokenApiSupportedNetworksCacheForTesting(): void {
  supportedChainIdsCache = undefined;
  supportedChainIdsCachedAt = 0;
  supportedChainIdsRefreshPromise = undefined;
}
