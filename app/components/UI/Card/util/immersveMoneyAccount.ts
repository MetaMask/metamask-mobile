import type {
  ImmersveMoneyAccountConfig,
  ImmersveProgramConfig,
} from '../../../../selectors/featureFlagController/card';
import { IMMERSVE_MONEY_ACCOUNT_TOKEN_ADDRESS } from '../../../../selectors/featureFlagController/card/defaults';
import { MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID } from './vedaToken';

export const IMMERSVE_MONEY_ACCOUNT_NETWORK = 'monad-mainnet';

export interface ImmersveMoneyAccountToken {
  caipChainId: typeof MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID;
  tokenAddress: string;
  decimals: number;
  symbol: string;
}

/** Veda on Monad — the token the NZ Immersve channel spends. */
export function getImmersveMoneyAccountToken(): ImmersveMoneyAccountToken {
  return {
    caipChainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
    tokenAddress: IMMERSVE_MONEY_ACCOUNT_TOKEN_ADDRESS,
    decimals: 6,
    symbol: 'veda',
  };
}

/**
 * Money account program for `country`, or null when this config does not
 * claim that country.
 */
export function getImmersveMoneyAccountConfig(
  config: ImmersveProgramConfig | null | undefined,
  country: string | null | undefined,
): ImmersveMoneyAccountConfig | null {
  const block = config?.moneyAccountConfig;
  if (!block?.fundingChannelId || !block.spenderAddress || !country) {
    return null;
  }
  const normalized = country.toUpperCase();
  const claimed = block.countries.some(
    (entry) => entry.toUpperCase() === normalized,
  );
  return claimed ? block : null;
}

export function isImmersveMoneyAccountFundingSource(
  source: { fundingChannelId?: string | null },
  config: ImmersveProgramConfig | null | undefined,
): boolean {
  const channelId = config?.moneyAccountConfig?.fundingChannelId;
  return Boolean(channelId && source.fundingChannelId === channelId);
}
