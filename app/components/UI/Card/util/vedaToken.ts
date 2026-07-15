import type { CaipChainId } from '@metamask/utils';
import type { DelegationSettingsResponse } from '../types';

export const MONEY_ACCOUNT_DELEGATION_NETWORK = 'monad';

export const MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID =
  'eip155:143' as CaipChainId;

export const MONEY_ACCOUNT_DELEGATION_TOKEN_KEY = 'veda';

export const MONEY_ACCOUNT_DISPLAY_SYMBOL = 'mUSD';

export interface VedaTokenConfig {
  caipChainId: CaipChainId;
  address: string;
  decimals: number;
  delegationContract?: string;
}

const parseEvmCaipChainId = (chainId: string): CaipChainId => {
  const numericChainId = chainId.startsWith('0x')
    ? parseInt(chainId, 16)
    : parseInt(chainId, 10);
  return `eip155:${numericChainId}` as CaipChainId;
};

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

export const getVedaTokenConfigFromFeatureFlag = (
  chains:
    | Record<
        string,
        | {
            tokens?:
              | {
                  address?: string | null;
                  symbol?: string | null;
                  decimals?: number | null;
                  enabled?: boolean | null;
                }[]
              | null;
          }
        | undefined
      >
    | null
    | undefined,
): VedaTokenConfig | null => {
  const vedaToken = (
    chains?.[MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID]?.tokens ?? []
  ).find(
    (token) =>
      token?.enabled !== false &&
      !!token?.address &&
      token.symbol?.toLowerCase() === MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  );

  if (!vedaToken?.address) {
    return null;
  }

  return {
    caipChainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
    address: vedaToken.address,
    decimals: vedaToken.decimals ?? 6,
  };
};

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

/**
 * True when the Money Account spending token (VEDA) is present and enabled in
 * the cardFeature allowlist for VEDA's chain.
 */
export const isMoneyAccountCardTokenAllowlisted = (
  chains:
    | Record<
        string,
        | {
            tokens?:
              | {
                  address?: string | null;
                  symbol?: string | null;
                  enabled?: boolean | null;
                }[]
              | null;
          }
        | undefined
      >
    | null
    | undefined,
  vedaConfig: VedaTokenConfig | null | undefined,
): boolean => {
  if (!chains || !vedaConfig) {
    return false;
  }
  const target = vedaConfig.address.toLowerCase();
  const chain = chains[vedaConfig.caipChainId];
  return (chain?.tokens ?? []).some(
    (token) =>
      token?.enabled !== false &&
      (token?.address?.toLowerCase() === target ||
        token?.symbol?.toLowerCase() === MONEY_ACCOUNT_DELEGATION_TOKEN_KEY),
  );
};
