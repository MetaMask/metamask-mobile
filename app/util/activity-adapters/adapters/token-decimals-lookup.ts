/**
 * Resolves token decimals from the user's imported/detected token entries when
 * a data source omits them. Mobile delta over the vendored extension adapters —
 * upstream with the shared `@metamask/activity-adapters` package.
 */
import type { Hex } from '@metamask/utils';

interface TokenEntry {
  address?: string;
  decimals?: number | string;
}

type TokensByChainAndAccount = Record<
  string,
  Record<string, TokenEntry[] | undefined> | undefined
>;

export interface TokenDecimalsLookupState {
  allTokens?: TokensByChainAndAccount;
  allDetectedTokens?: TokensByChainAndAccount;
}

/** Normalizes a CAIP-2 (`eip155:56`) or hex (`0x38`) chain id to lowercase hex. */
export function toHexChainId(chainId: string): Hex | undefined {
  if (chainId.startsWith('0x')) {
    return chainId.toLowerCase() as Hex;
  }
  const caipMatch = chainId.match(/^eip155:(\d+)$/u);
  if (!caipMatch) {
    return undefined;
  }
  return `0x${Number(caipMatch[1]).toString(16)}`;
}

function toValidDecimals(
  value: number | string | undefined,
): number | undefined {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

function findInTokenMap(
  tokensByChainAndAccount: TokensByChainAndAccount | undefined,
  hexChainId: Hex,
  contractAddress: string,
): number | undefined {
  const accounts = tokensByChainAndAccount?.[hexChainId];
  if (!accounts) {
    return undefined;
  }
  const target = contractAddress.toLowerCase();
  for (const tokens of Object.values(accounts)) {
    const match = tokens?.find(
      (token) => token.address?.toLowerCase() === target,
    );
    const decimals = toValidDecimals(match?.decimals);
    if (decimals !== undefined) {
      return decimals;
    }
  }
  return undefined;
}

/**
 * Finds a token's decimals in TokensController state (imported first, then
 * detected), across all accounts for the given chain.
 *
 * @param state - TokensController-shaped state slice.
 * @param chainId - CAIP-2 or hex chain id.
 * @param contractAddress - ERC-20 contract address.
 * @returns The token's decimals, or `undefined` when unknown.
 */
export function findKnownTokenDecimals(
  state: TokenDecimalsLookupState | undefined,
  chainId: string,
  contractAddress: string,
): number | undefined {
  if (!state || !contractAddress) {
    return undefined;
  }
  const hexChainId = toHexChainId(chainId);
  if (!hexChainId) {
    return undefined;
  }
  return (
    findInTokenMap(state.allTokens, hexChainId, contractAddress) ??
    findInTokenMap(state.allDetectedTokens, hexChainId, contractAddress)
  );
}
