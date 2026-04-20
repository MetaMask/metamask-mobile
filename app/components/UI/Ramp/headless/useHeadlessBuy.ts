import { useCallback, useMemo } from 'react';
import { CaipChainId } from '@metamask/utils';

import ReduxService from '../../../../core/redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { getRampCallbackBaseUrl } from '../utils/getRampCallbackBaseUrl';
import useRampsController from '../hooks/useRampsController';

import type { HeadlessBuyResult, HeadlessGetQuotesParams } from './types';

/**
 * Extract the CAIP chain id (`namespace:reference`) from a CAIP-19 asset id
 * such as `eip155:1/erc20:0x…`. Returns `null` for malformed inputs.
 */
export function getChainIdFromAssetId(assetId: string): CaipChainId | null {
  const slashIndex = assetId.indexOf('/');
  if (slashIndex <= 0) {
    return null;
  }
  return assetId.slice(0, slashIndex) as CaipChainId;
}

/**
 * Imperative wallet-address lookup so `getQuotes` can run outside of React.
 * Mirrors what `useRampAccountAddress` does, but pulls from the redux store
 * directly because the chain id is only known when the caller invokes
 * `getQuotes`.
 */
function resolveWalletAddressForChain(chainId: CaipChainId): string | null {
  const state = ReduxService.store.getState();
  const selectByScope = selectSelectedInternalAccountByScope(state);
  const account = selectByScope(chainId);
  if (!account?.address) {
    return null;
  }
  return getFormattedAddressFromInternalAccount(account);
}

/**
 * `useHeadlessBuy` is the public, read-only facade for driving the Unified
 * Buy v2 flow from outside the Ramp UI. Phase 2 only exposes catalog data,
 * orders and a `getQuotes` helper — start/cancel and lifecycle callbacks
 * land in later phases.
 *
 * @example
 * ```tsx
 * const { tokens, providers, paymentMethods, getQuotes } = useHeadlessBuy();
 *
 * const quotes = await getQuotes({
 *   assetId: 'eip155:59144/erc20:0xaca…',
 *   amount: 25,
 *   paymentMethodIds: ['/payments/debit-credit-card'],
 * });
 * ```
 */
export function useHeadlessBuy(): HeadlessBuyResult {
  const {
    tokens,
    tokensLoading,
    tokensError,
    providers,
    providersLoading,
    providersError,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    countries,
    countriesLoading,
    countriesError,
    userRegion,
    orders,
    getOrderById,
    getQuotes: getQuotesRaw,
  } = useRampsController();

  const getQuotes = useCallback(
    async (params: HeadlessGetQuotesParams) => {
      const chainId = getChainIdFromAssetId(params.assetId);
      const walletAddress =
        params.walletAddress ??
        (chainId ? resolveWalletAddressForChain(chainId) : null);
      if (!walletAddress) {
        throw new Error(
          `useHeadlessBuy: could not resolve wallet address for assetId="${params.assetId}". Pass walletAddress explicitly or ensure an account is selected for chain ${chainId ?? 'unknown'}.`,
        );
      }
      return getQuotesRaw({
        assetId: params.assetId,
        amount: params.amount,
        walletAddress,
        paymentMethods: params.paymentMethodIds,
        providers: params.providerIds,
        redirectUrl: params.redirectUrl ?? getRampCallbackBaseUrl(),
        forceRefresh: params.forceRefresh,
      });
    },
    [getQuotesRaw],
  );

  const errors = useMemo(
    () => ({
      tokens: tokensError,
      providers: providersError,
      paymentMethods: paymentMethodsError,
      countries: countriesError,
    }),
    [tokensError, providersError, paymentMethodsError, countriesError],
  );

  const isLoading =
    tokensLoading ||
    providersLoading ||
    paymentMethodsLoading ||
    countriesLoading;

  return {
    tokens,
    providers: providers ?? [],
    paymentMethods: paymentMethods ?? [],
    countries: countries ?? [],
    userRegion,
    orders,
    getOrderById,
    getQuotes,
    isLoading,
    errors,
  };
}

export default useHeadlessBuy;
