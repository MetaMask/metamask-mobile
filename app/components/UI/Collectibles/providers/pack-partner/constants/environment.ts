import { SolScope } from '@metamask/keyring-api';

export type PackPartnerEnvironment = 'mainnet' | 'devnet';

/** Settlement configuration is fixed independently of local API hosts. */
export const PACK_PARTNER_ENVIRONMENTS = {
  mainnet: {
    scope: SolScope.Mainnet,
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  devnet: {
    scope: SolScope.Devnet,
    // The partner's USDC-Dev mint, distinct from Circle's devnet USDC.
    usdcMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  },
} as const;

export function resolvePackPartnerEnvironment(
  value: string | undefined,
  development: boolean,
): PackPartnerEnvironment {
  if (!value) return development ? 'devnet' : 'mainnet';
  if (value === 'devnet' || value === 'mainnet') return value;
  throw new Error('MM_COLLECTIBLES_ENVIRONMENT must be devnet or mainnet');
}

/**
 * Accepts HTTPS base URLs only, including an optional API path. Missing or
 * malformed local configuration leaves the provider unavailable, not the wallet.
 */
export function resolvePackPartnerUrl(
  value: string | undefined,
): string | undefined {
  if (!value?.trim() || value.includes('?') || value.includes('#'))
    return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return undefined;
    return url.toString().replace(/\/+$/u, '');
  } catch {
    return undefined;
  }
}

interface PackPartnerEndpoints {
  apiUrl?: string;
  cardsApiUrl?: string;
  websiteUrl?: string;
}

/** Selects only the active environment's local endpoints, with no fallback. */
export function resolvePackPartnerConfig(
  environment: PackPartnerEnvironment,
  endpoints: Partial<Record<PackPartnerEnvironment, PackPartnerEndpoints>>,
) {
  const selected = endpoints[environment];
  return {
    ...PACK_PARTNER_ENVIRONMENTS[environment],
    apiUrl: resolvePackPartnerUrl(selected?.apiUrl),
    cardsApiUrl: resolvePackPartnerUrl(selected?.cardsApiUrl),
    websiteUrl: resolvePackPartnerUrl(selected?.websiteUrl),
  };
}

export const PACK_PARTNER_ENVIRONMENT = resolvePackPartnerEnvironment(
  process.env.MM_COLLECTIBLES_ENVIRONMENT,
  typeof __DEV__ !== 'undefined' && __DEV__ && process.env.NODE_ENV !== 'test',
);
export const PACK_PARTNER_CONFIG = resolvePackPartnerConfig(
  PACK_PARTNER_ENVIRONMENT,
  {
    mainnet: {
      apiUrl: process.env.MM_PACK_PARTNER_MAINNET_API_URL,
      cardsApiUrl: process.env.MM_PACK_PARTNER_MAINNET_CARDS_API_URL,
      websiteUrl: process.env.MM_PACK_PARTNER_MAINNET_WEBSITE_URL,
    },
    devnet: {
      apiUrl: process.env.MM_PACK_PARTNER_DEVNET_API_URL,
      cardsApiUrl: process.env.MM_PACK_PARTNER_DEVNET_CARDS_API_URL,
      websiteUrl: process.env.MM_PACK_PARTNER_DEVNET_WEBSITE_URL,
    },
  },
);

/**
 * Temporary local devnet access until the proxy is configured.
 * Never use a client-side partner key on mainnet or in a release build.
 */
export function resolvePackPartnerApiKey(
  environment: PackPartnerEnvironment,
  devnetKey: string | undefined,
  development: boolean,
): string | undefined {
  return development && environment === 'devnet'
    ? devnetKey?.trim() || undefined
    : undefined;
}

// Keep the environment-variable read inside the development-only branch.
// Configure it only in the ignored local .js.env, never in CI/release secrets.
export const PACK_PARTNER_API_KEY =
  typeof __DEV__ !== 'undefined' && __DEV__
    ? resolvePackPartnerApiKey(
        PACK_PARTNER_ENVIRONMENT,
        process.env.PACK_PARTNER_DEVNET_API_KEY,
        true,
      )
    : undefined;
