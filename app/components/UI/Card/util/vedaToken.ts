import type { CaipChainId } from '@metamask/utils';
import type { DelegationSettingsResponse } from '../types';

/**
 * Network name (matched case-insensitively against
 * `DelegationSettingsNetwork.network`) that hosts the Money Account
 * delegation token.
 */
export const MONEY_ACCOUNT_DELEGATION_NETWORK = 'monad';

/**
 * Object key under `DelegationSettingsNetwork.tokens` that identifies the
 * Money Account delegation (Veda vault) token. The key is the contract,
 * not the symbol — symbol/address vary across environments.
 */
export const MONEY_ACCOUNT_DELEGATION_TOKEN_KEY = 'veda';

/**
 * User-facing symbol shown wherever a Veda token would otherwise be
 * rendered. Veda is implementation detail; the product is mUSD.
 */
export const MONEY_ACCOUNT_DISPLAY_SYMBOL = 'mUSD';

export interface VedaTokenConfig {
  caipChainId: CaipChainId;
  address: string;
  decimals: number;
  delegationContract: string;
}

const parseEvmCaipChainId = (chainId: string): CaipChainId => {
  const numericChainId = chainId.startsWith('0x')
    ? parseInt(chainId, 16)
    : parseInt(chainId, 10);
  return `eip155:${numericChainId}` as CaipChainId;
};

/**
 * Reads the Veda token entry from delegation settings. Returns `null` when
 * the response is missing, the Monad network is absent, or the Veda key is
 * not present (e.g. older provider responses or environments where the
 * token has not been deployed yet).
 */
export const getVedaTokenConfig = (
  delegationSettings: DelegationSettingsResponse | null | undefined,
): VedaTokenConfig | null => {
  if (!delegationSettings?.networks?.length) {
    return null;
  }

  const monadNetwork = delegationSettings.networks.find(
    (network) =>
      network.network?.toLowerCase() === MONEY_ACCOUNT_DELEGATION_NETWORK &&
      network.delegationContract,
  );

  if (!monadNetwork) {
    return null;
  }

  const vedaToken = monadNetwork.tokens?.[MONEY_ACCOUNT_DELEGATION_TOKEN_KEY];
  if (!vedaToken?.address) {
    return null;
  }

  return {
    caipChainId: parseEvmCaipChainId(monadNetwork.chainId),
    address: vedaToken.address,
    decimals: vedaToken.decimals,
    delegationContract: monadNetwork.delegationContract,
  };
};

/**
 * True when the given token represents the Veda vault entry from
 * delegation settings. Matching is anchored on chain (must equal the
 * Veda network) plus any of:
 *
 * - `address` matches `vedaConfig.address` (case-insensitive)
 * - `stagingTokenAddress` matches `vedaConfig.address` — Baanx's
 * `/v1/wallet/external` response keeps the SDK mainnet address in
 * `address` and the actual on-chain address in `stagingTokenAddress`
 * for non-production environments
 * - `symbol` equals the delegation-settings key (`veda`,
 * case-insensitive) — needed because the funding-asset path can
 * return `address: null` when the card feature-flag token list does
 * not include Veda yet; the `currency` field of `/v1/wallet/external`
 * is the same identifier as the delegation-settings key, so this is
 * equivalent to matching the key.
 *
 * Since Money Accounts can only delegate to Veda — and Veda is only
 * funded by Money Accounts — this predicate is equivalent to "is this
 * a Money Account entry".
 */
export const isVedaToken = (
  token: {
    address?: string | null;
    stagingTokenAddress?: string | null;
    caipChainId?: CaipChainId | string | null;
    symbol?: string | null;
  },
  vedaConfig: VedaTokenConfig | null,
): boolean => {
  if (!vedaConfig || !token.caipChainId) {
    return false;
  }
  if (token.caipChainId !== vedaConfig.caipChainId) {
    return false;
  }
  const target = vedaConfig.address.toLowerCase();
  return (
    token.address?.toLowerCase() === target ||
    token.stagingTokenAddress?.toLowerCase() === target ||
    token.symbol?.toLowerCase() === MONEY_ACCOUNT_DELEGATION_TOKEN_KEY
  );
};
