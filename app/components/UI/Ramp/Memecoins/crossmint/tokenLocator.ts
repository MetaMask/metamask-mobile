import {
  CROSSMINT_STAGING_XMEME_LOCATOR,
  CROSSMINT_STAGING_XMEME_TOKEN,
  DEMO_MEMECOIN_CATALOG_STUBS,
} from './constants';
import type {
  CrossmintMemecoinToken,
  CrossmintTokenAvailability,
} from './types';

export function parseTokenLocator(tokenLocator: string): {
  chain: string;
  address: string;
} {
  const separatorIndex = tokenLocator.indexOf(':');
  if (separatorIndex <= 0) {
    return { chain: 'unknown', address: tokenLocator };
  }

  return {
    chain: tokenLocator.slice(0, separatorIndex),
    address: tokenLocator.slice(separatorIndex + 1),
  };
}

function shortenAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function toMemecoinToken(
  availability: CrossmintTokenAvailability,
): CrossmintMemecoinToken {
  if (availability.token === CROSSMINT_STAGING_XMEME_LOCATOR) {
    return {
      ...CROSSMINT_STAGING_XMEME_TOKEN,
      available: availability.available,
      creditCardPayment: availability.features.creditCardPayment,
    };
  }

  const { chain, address } = parseTokenLocator(availability.token);
  const short = shortenAddress(address);

  return {
    tokenLocator: availability.token,
    chain,
    address,
    available: availability.available,
    creditCardPayment: availability.features.creditCardPayment,
    name: short,
    symbol: short.toUpperCase(),
  };
}

export function mergeStagingXmeme(
  tokens: CrossmintMemecoinToken[],
): CrossmintMemecoinToken[] {
  const withoutXmeme = tokens.filter(
    (token) => token.tokenLocator !== CROSSMINT_STAGING_XMEME_LOCATOR,
  );
  return [CROSSMINT_STAGING_XMEME_TOKEN, ...withoutXmeme];
}

/**
 * Appends demo Solana memecoin stubs (TRUMP / PENGU / FARTCOIN) that have live
 * MetaMask Price API coverage. Skips locators already present in `tokens`.
 */
export function mergeDemoMemecoinStubs(
  tokens: CrossmintMemecoinToken[],
): CrossmintMemecoinToken[] {
  const existing = new Set(tokens.map((token) => token.tokenLocator));
  const stubs = DEMO_MEMECOIN_CATALOG_STUBS.filter(
    (stub) => !existing.has(stub.tokenLocator),
  );
  return [...tokens, ...stubs];
}

/**
 * Maps Crossmint chain slug to MetaMask CAIP chain id for recipient lookup.
 */
export function crossmintChainToCaipChainId(chain: string): string | null {
  switch (chain.toLowerCase()) {
    case 'solana':
      return 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    case 'base':
      return 'eip155:8453';
    case 'ethereum':
    case 'eth':
      return 'eip155:1';
    case 'polygon':
      return 'eip155:137';
    case 'arbitrum':
      return 'eip155:42161';
    case 'optimism':
      return 'eip155:10';
    case 'bsc':
      return 'eip155:56';
    default:
      if (chain.startsWith('eip155:') || chain.startsWith('solana:')) {
        return chain;
      }
      return null;
  }
}

/**
 * Maps a Crossmint token locator (`chain:address`) to a MetaMask CAIP-19 asset
 * id for Price / Tokens API lookups.
 */
export function crossmintLocatorToCaipAssetId(
  token: Pick<CrossmintMemecoinToken, 'chain' | 'address' | 'tokenLocator'>,
): string | null {
  const caipChainId = crossmintChainToCaipChainId(token.chain);
  if (!caipChainId || !token.address) {
    return null;
  }

  if (caipChainId.startsWith('solana:')) {
    return `${caipChainId}/token:${token.address}`;
  }

  if (caipChainId.startsWith('eip155:')) {
    return `${caipChainId}/erc20:${token.address.toLowerCase()}`;
  }

  return null;
}
