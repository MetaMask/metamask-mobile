import type { CaipChainId } from '@metamask/utils';
import { isVedaToken, type VedaTokenConfig } from './vedaToken';

/**
 * Returns true when the given token is a Money Account entry.
 *
 * Single source of truth for "is this token tied to a Money Account?"
 * across Card surfaces (Card Home label, Add Funds redirect, Manage Limit
 * lock, Asset Selection per-row label).
 *
 * Identity is established by matching the token's address+chain against
 * the Veda vault token described by delegation settings. Money Accounts
 * are the only source of funding for Veda — and Veda is the only token
 * Money Accounts can delegate — so token identity is equivalent to the
 * Money-Account-ownership signal.
 *
 * @param token - The candidate funding token (address + caipChainId).
 * @param vedaConfig - The resolved Veda token config from delegation
 * settings, or `null` when delegation settings are unavailable.
 * @returns True when the token matches the Veda entry.
 */
export const isMoneyAccountEntry = (
  token: {
    address?: string | null;
    stagingTokenAddress?: string | null;
    caipChainId?: CaipChainId | string | null;
    symbol?: string | null;
  },
  vedaConfig: VedaTokenConfig | null,
): boolean => isVedaToken(token, vedaConfig);
