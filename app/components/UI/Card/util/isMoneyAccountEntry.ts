import type { CaipChainId } from '@metamask/utils';
import { isVedaToken, type VedaTokenConfig } from './vedaToken';

export const isMoneyAccountEntry = (
  token: {
    address?: string | null;
    stagingTokenAddress?: string | null;
    caipChainId?: CaipChainId | string | null;
    symbol?: string | null;
  },
  vedaConfig: VedaTokenConfig | null,
): boolean => isVedaToken(token, vedaConfig);
