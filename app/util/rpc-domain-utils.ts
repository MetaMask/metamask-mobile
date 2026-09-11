import { SafeChain } from '../components/hooks/useSafeChains';
import StorageWrapper from '../store/storage-wrapper';
import Engine from '../core/Engine';
import Logger from './Logger';

// Cache for known domains
let knownDomainsSet: Set<string> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Get module state - encapsulates access to internal state
 */
export function getModuleState() {
  return {
    knownDomainsSet,
    initPromise,
    setKnownDomainsSet: (value: Set<string> | null) => {
      knownDomainsSet = value;
    },
    setInitPromise: (value: Promise<void> | null) => {
      initPromise = value;
    },
  };
}

/**
 * Get the list of safe chains from cache only
 * This allows us to use chain data without making network requests
 */
export async function getSafeChainsListFromCacheOnly(): Promise<SafeChain[]> {
  try {
    const cachedData = await StorageWrapper.getItem('SAFE_CHAINS_CACHE');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        return parsed;
      } catch (error) {
        Logger.log('Error parsing cached chains data:', error);
      }
    }
    return [];
  } catch (error) {
    Logger.log('Error retrieving chains list from cache:', error);
    return [];
  }
}

/**
 * Extract the lowercased hostname from a URL, without a full WHATWG parse.
 *
 * `new URL()` is the obvious way to do this, and it is what this module used
 * to do. The polyfill installed by `react-native-url-polyfill`
 * (`whatwg-url-without-unicode`) runs a full state-machine parse with
 * `ucs2decode`, percent-decoding and IDNA mapping for every URL.
 *
 * Per call that is unremarkable — a release-build CPU profile puts it at
 * roughly 0.24 ms on a mid-range Android device. The problem is volume:
 * {@link initializeRpcProviderDomains} parses every RPC endpoint of every chain
 * in the cached safe-chains list, and `chainid.network/chains.json` currently
 * carries **2,757 chains with 4,107 RPC URLs**. That measured **~1 second of
 * the startup JS thread**, purely to read hostnames.
 *
 * This reads the authority component directly, which is all the callers need.
 * Deliberately matched to `new URL()` on the inputs that matter:
 *
 * It requires a scheme, so a bare `"invalid-url"` is rejected exactly as
 * `new URL()` throws on it. It strips userinfo, port, path, query and fragment,
 * preserves IPv6 literals in brackets, and lowercases, since callers compare
 * case-insensitively.
 *
 * It agrees with `new URL().hostname` on all 4,107 RPC URLs in
 * `chains.json`, and on a 58k-input fuzz it **never accepts a URL that
 * `new URL()` rejects**. That direction matters: `isPublicRpcDomain` decides
 * whether an endpoint URL is safe to report to analytics, so every divergence
 * has to fail closed.
 *
 * Where it does diverge, it is always stricter or produces an unrecognised
 * hostname — both of which classify as `invalid`/`private` and are therefore
 * *not* reported:
 *
 * Backslashes: `new URL()` treats them as a path separator for special schemes,
 * so `https://host\\evil.com` parses as host `host`. Rejected here.
 * Whitespace: `new URL()` strips tabs and newlines mid-host. Rejected here.
 * Percent-encoding: `new URL()` decodes it, and guessing at that could turn a
 * hostile host into a trusted-looking one, so it is rejected.
 * Exotic IPv4 and IDN: `new URL()` normalises `0x7f.1` to `127.0.0.1` and
 * unicode hosts to punycode. This returns the raw form, which will not match
 * anything.
 *
 * Both the set-building and lookup paths use this function, so set membership
 * stays self-consistent regardless.
 *
 * @param url - The URL to extract a hostname from.
 * @returns The lowercased hostname, or `undefined` if the URL has no usable one.
 */
export function extractHostname(url: string): string | undefined {
  const schemeEnd = url.indexOf('://');
  if (schemeEnd === -1) {
    return undefined;
  }

  // A URL needs a real scheme; `new URL('://example.com')` throws.
  if (!/^[a-z][a-z0-9+.-]*$/iu.test(url.slice(0, schemeEnd))) {
    return undefined;
  }

  let authority = url.slice(schemeEnd + 3);

  const pathStart = authority.search(/[/?#]/u);
  if (pathStart !== -1) {
    authority = authority.slice(0, pathStart);
  }

  // Userinfo may itself contain '@', so the last one delimits the host.
  const userInfoEnd = authority.lastIndexOf('@');
  if (userInfoEnd !== -1) {
    authority = authority.slice(userInfoEnd + 1);
  }

  let host: string;
  let port: string | undefined;

  if (authority.startsWith('[')) {
    // IPv6 literal, which keeps its brackets in `URL.hostname`.
    const bracketEnd = authority.indexOf(']');
    if (bracketEnd === -1) {
      return undefined;
    }
    host = authority.slice(0, bracketEnd + 1);
    const afterHost = authority.slice(bracketEnd + 1);
    if (afterHost !== '') {
      if (!afterHost.startsWith(':')) {
        return undefined;
      }
      port = afterHost.slice(1);
    }
  } else {
    const portStart = authority.indexOf(':');
    host = portStart === -1 ? authority : authority.slice(0, portStart);
    if (portStart !== -1) {
      port = authority.slice(portStart + 1);
    }

    // `new URL()` rejects empty hosts and these forbidden characters.
    // `%` is rejected rather than decoded: `new URL()` percent-decodes hosts,
    // and guessing at that here could turn a hostile host into a trusted-looking
    // one. No real RPC endpoint uses it (0 of 4,107 in `chains.json`).
    if (!host || /[\s\\/?#@[\]<>"^|%]/u.test(host)) {
      return undefined;
    }
  }

  // `new URL()` rejects the whole URL on a malformed port, so this must too.
  // Without it, `https://example.com:99999` would yield a hostname here while
  // `new URL()` throws — making this function *more* permissive than the spec,
  // which is the wrong direction: `isPublicRpcDomain` decides whether an
  // endpoint URL is safe to report to analytics, so every divergence should
  // fail closed.
  if (port !== undefined && port !== '') {
    if (!/^\d{1,5}$/u.test(port) || Number(port) > 65535) {
      return undefined;
    }
  }

  return host.toLowerCase();
}

/**
 * Initialize the set of known domains from the chains list
 */
export async function initializeRpcProviderDomains(): Promise<void> {
  const state = getModuleState();
  if (state.initPromise) {
    return state.initPromise;
  }
  const promise = (async () => {
    try {
      const chainsList = await getSafeChainsListFromCacheOnly();
      const newKnownDomainsSet = new Set<string>();

      for (const chain of chainsList) {
        if (chain.rpc && Array.isArray(chain.rpc)) {
          for (const rpcUrl of chain.rpc) {
            const hostname = extractHostname(rpcUrl);
            if (hostname) {
              newKnownDomainsSet.add(hostname);
            }
          }
        }
      }
      state.setKnownDomainsSet(newKnownDomainsSet);
    } catch (error) {
      state.setKnownDomainsSet(new Set<string>());
    }
  })();

  state.setInitPromise(promise);
  return promise;
}

/**
 * Get the current set of known domains
 * @returns The set of known domains or null if not initialized
 */
export function getKnownDomains(): Set<string> | null {
  return getModuleState().knownDomainsSet;
}

/**
 * Check if a domain is in the known domains list
 *
 * @param domain - The domain to check
 */
export function isKnownDomain(domain: string): boolean {
  const state = getModuleState();
  return state.knownDomainsSet?.has(domain?.toLowerCase()) ?? false;
}

export const RpcDomainStatus = {
  Invalid: 'invalid',
  Private: 'private',
  Unknown: 'unknown',
} as const;

export type RpcDomainStatus =
  (typeof RpcDomainStatus)[keyof typeof RpcDomainStatus];

/**
 * Checks if an RPC endpoint URL has a valid public domain.
 * Extracts the domain from the URL and verifies it's not private, invalid, or unknown.
 *
 * @param endpointUrl - The RPC endpoint URL to check
 * @returns True if the URL has a valid public domain, false otherwise
 */
export function isPublicRpcDomain(endpointUrl: string): boolean {
  const rpcDomain = extractRpcDomain(endpointUrl);
  return !Object.values(RpcDomainStatus).includes(rpcDomain as RpcDomainStatus);
}

function parseDomain(url: string): string | undefined {
  // Must use the same extractor as `initializeRpcProviderDomains`, otherwise a
  // hostname could be stored one way and looked up another, and known domains
  // would silently report as `private`.
  const normalizedUrl = url.includes('://') ? url : `https://${url}`;
  return extractHostname(normalizedUrl);
}

// Allowed provider domains for RPC endpoint validation
const ALLOWED_PROVIDER_DOMAINS = new Set(['infura.io', 'alchemyapi.io']);

/**
 * Check if a hostname is an allowed provider domain or legitimate subdomain
 * @param hostname - The hostname to check
 * @returns True if the hostname is allowed, false otherwise
 */
function isAllowedProviderDomain(hostname: string): boolean {
  // Check exact match first
  if (ALLOWED_PROVIDER_DOMAINS.has(hostname)) {
    return true;
  }

  // Check if it's a legitimate subdomain of any allowed domain
  return [...ALLOWED_PROVIDER_DOMAINS].some((allowedDomain) =>
    hostname.endsWith(`.${allowedDomain}`),
  );
}

/**
 * Extracts the domain from an RPC URL for analytics tracking
 * @param rpcUrl - The RPC URL to extract domain from
 * @returns The domain extracted from the URL, or "private" for non-known domains, or "invalid" for invalid URLs
 */
export function extractRpcDomain(rpcUrl: string): RpcDomainStatus | string {
  const domain = parseDomain(rpcUrl);
  if (!domain) {
    return RpcDomainStatus.Invalid;
  }

  // Check if this is a known domain
  if (isKnownDomain(domain)) {
    return domain;
  }

  // Check if it's an allowed provider domain (Infura, Alchemy, etc.)
  if (isAllowedProviderDomain(domain)) {
    return domain;
  }

  // Special case for local/development nodes
  if (domain === 'localhost' || domain === '127.0.0.1') {
    return RpcDomainStatus.Private;
  }

  // For all other domains, return "private" for privacy
  return RpcDomainStatus.Private;
}

/**
 * Gets the RPC URL for a specific chain ID from the NetworkController
 *
 * @param chainId - The chain ID to get the RPC URL for
 * @returns The RPC URL for the chain, or 'unknown' if not found
 */
export function getNetworkRpcUrl(chainId: string): string {
  try {
    const { NetworkController } = Engine.context;

    // Find network clientID for chainID
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      chainId as `0x${string}`,
    );
    if (!networkClientId) {
      return 'unknown';
    }

    // Get network config
    const networkConfig =
      NetworkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );
    if (!networkConfig) {
      return 'unknown';
    }

    // Check if there is a direct rpcUrl property (legacy format)
    if ('rpcUrl' in networkConfig && networkConfig.rpcUrl) {
      return typeof networkConfig.rpcUrl === 'string'
        ? networkConfig.rpcUrl
        : 'unknown';
    }

    // If we use rpcEndpoints array
    if (networkConfig.rpcEndpoints?.length > 0) {
      const defaultEndpointIndex = networkConfig.defaultRpcEndpointIndex || 0;
      return (
        networkConfig.rpcEndpoints[defaultEndpointIndex]?.url ||
        networkConfig.rpcEndpoints[0]?.url ||
        'unknown'
      );
    }
    return 'unknown';
  } catch (error: unknown) {
    Logger.error(
      error instanceof Error
        ? error
        : new Error(`Error getting RPC URL: ${String(error)}`),
    );
    return 'unknown';
  }
}
