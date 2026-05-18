import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CaipChainId } from '@metamask/utils';
import type { Provider } from '@metamask/ramps-controller';

import ReduxService from '../../../../core/redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { getRampCallbackBaseUrl } from '../utils/getRampCallbackBaseUrl';
import {
  getProviderBuyLimit,
  type ProviderBuyLimit,
} from '../utils/providerLimits';
import useRampsController from '../hooks/useRampsController';

import {
  closeSession,
  createSession,
  failSession,
  getActiveSessionId,
} from './sessionRegistry';
import type {
  HeadlessBuyCallbacks,
  HeadlessBuyErrorCode,
  HeadlessBuyParams,
  HeadlessBuyResult,
  HeadlessGetQuotesParams,
  StartHeadlessBuyResult,
} from './types';

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

interface BoundsCandidate {
  providerId: string;
  paymentMethodId: string;
  bounds: ProviderBuyLimit | undefined;
}

/**
 * Returns a no-network LIMIT_EXCEEDED error only when every requested
 * provider/payment candidate has known bounds and rejects the amount.
 */
function buildStaticBoundsRejection(args: {
  amount: number;
  providerIds: readonly string[] | undefined;
  paymentMethodIds: readonly string[] | undefined;
  fiatCurrency: string | undefined;
  providers: readonly Provider[];
}):
  | (Error & {
      headlessBuyErrorCode: 'LIMIT_EXCEEDED';
      details: Record<string, unknown>;
    })
  | undefined {
  const { amount, providerIds, paymentMethodIds, fiatCurrency, providers } =
    args;
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !providerIds ||
    providerIds.length === 0 ||
    !paymentMethodIds ||
    paymentMethodIds.length === 0 ||
    !fiatCurrency ||
    providers.length === 0
  ) {
    return undefined;
  }

  const candidates: BoundsCandidate[] = [];
  for (const providerId of providerIds) {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      for (const paymentMethodId of paymentMethodIds) {
        candidates.push({ providerId, paymentMethodId, bounds: undefined });
      }
      continue;
    }
    for (const paymentMethodId of paymentMethodIds) {
      candidates.push({
        providerId,
        paymentMethodId,
        bounds: getProviderBuyLimit(provider, fiatCurrency, paymentMethodId),
      });
    }
  }

  const allReject =
    candidates.length > 0 &&
    candidates.every(
      (c) =>
        c.bounds !== undefined &&
        (amount < c.bounds.minAmount || amount > c.bounds.maxAmount),
    );
  if (!allReject) {
    return undefined;
  }

  const rejections = candidates.map((c) => ({
    provider: c.providerId,
    paymentMethodId: c.paymentMethodId,
    minAmount: c.bounds?.minAmount,
    maxAmount: c.bounds?.maxAmount,
  }));
  const formatted = rejections
    .map(
      (r) =>
        `${r.provider}/${r.paymentMethodId}: [${r.minAmount}, ${r.maxAmount}]`,
    )
    .join('; ');
  const error = new Error(
    `useHeadlessBuy.getQuotes: ${amount} ${fiatCurrency} is outside the static bounds of every candidate (${formatted}).`,
  ) as Error & {
    headlessBuyErrorCode: 'LIMIT_EXCEEDED';
    details: Record<string, unknown>;
  };
  error.headlessBuyErrorCode = 'LIMIT_EXCEEDED';
  error.details = {
    amount,
    currency: fiatCurrency,
    rejections,
    source: 'static-bounds',
  };
  return error;
}

/**
 * Public facade for driving the Unified Buy v2 flow from outside Ramp UI.
 */
export function useHeadlessBuy(): HeadlessBuyResult {
  const navigation = useNavigation();
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
    setSelectedToken,
    setSelectedProvider,
    setSelectedPaymentMethod,
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

      const fiatCurrency =
        params.currency ?? userRegion?.country?.currency ?? undefined;
      const staticRejection = buildStaticBoundsRejection({
        amount: params.amount,
        providerIds: params.providerIds,
        paymentMethodIds: params.paymentMethodIds,
        fiatCurrency,
        providers: providers ?? [],
      });
      if (staticRejection) {
        const activeId = getActiveSessionId();
        if (activeId) {
          failSession(activeId, staticRejection, 'LIMIT_EXCEEDED');
        }
        throw staticRejection;
      }

      const quotesResponse = await getQuotesRaw({
        assetId: params.assetId,
        amount: params.amount,
        walletAddress,
        paymentMethods: params.paymentMethodIds,
        providers: params.providerIds,
        redirectUrl: params.redirectUrl ?? getRampCallbackBaseUrl(),
        forceRefresh: params.forceRefresh,
      });

      // UB2 surfaces empty-success provider rejections; headless must too.
      const errorEntries = (quotesResponse?.error ?? []) as readonly Record<
        string,
        unknown
      >[];
      const successCount = quotesResponse?.success?.length ?? 0;
      if (successCount === 0 && errorEntries.length > 0) {
        const providerErrors = errorEntries.map((entry) => ({
          provider:
            typeof entry.provider === 'string' ? entry.provider : 'unknown',
          message: typeof entry.error === 'string' ? entry.error : undefined,
          code: typeof entry.code === 'string' ? entry.code : undefined,
        }));
        const combinedMessage = providerErrors
          .map((p) => `${p.provider}: ${p.message ?? '(no message)'}`)
          .join('; ');

        // Classify per provider so a rate-limit signal cannot veto another
        // provider's buy-limit signal.
        const limitWord = /\b(minimum|maximum|limit)\b/i;
        const rateRequestWord = /\b(rate|request)\b/i;
        const limitCodePattern = /limit/i;
        const rateRequestCodePattern = /rate|request/i;
        const isLimitExceeded = providerErrors.some((p) => {
          if (p.code !== undefined) {
            return (
              limitCodePattern.test(p.code) &&
              !rateRequestCodePattern.test(p.code)
            );
          }
          const message = p.message ?? '';
          return limitWord.test(message) && !rateRequestWord.test(message);
        });
        const code: HeadlessBuyErrorCode = isLimitExceeded
          ? 'LIMIT_EXCEEDED'
          : 'QUOTE_FAILED';

        const error = new Error(combinedMessage) as Error & {
          headlessBuyErrorCode: HeadlessBuyErrorCode;
          details: Record<string, unknown>;
        };
        error.headlessBuyErrorCode = code;
        error.details = {
          providerErrors,
          successCount,
          errorCount: errorEntries.length,
          source: 'network-reject',
        };

        const activeId = getActiveSessionId();
        if (activeId) {
          failSession(activeId, error, code);
        }
        throw error;
      }

      return quotesResponse;
    },
    [getQuotesRaw, providers, userRegion],
  );

  const startHeadlessBuy = useCallback(
    (
      params: HeadlessBuyParams,
      callbacks: HeadlessBuyCallbacks,
    ): StartHeadlessBuyResult => {
      // Seed the controller — mirrors what BuildQuote does before calling
      // continueWithQuote. Screens in the native auth loop (OtpCode,
      // useTransakRouting) read selectedToken.chainId, selectedPaymentMethod
      // and walletAddress from the controller rather than from navigation
      // params. Without seeding, all three are null in headless mode
      // (controller was never set), causing the post-OTP quote fetch and
      // wallet-address resolution to fail with empty strings.
      //
      // setSelectedToken takes the assetId string directly. For provider and
      // payment method we look up the full objects from the currently loaded
      // catalogs — almost always populated since the caller just ran
      // getQuotes(). If a lookup misses (cross-provider edge case), passing
      // null is safe: the auto-select useEffect in useRampsPaymentMethods will
      // correct the payment method once the query refetches for the new
      // provider.
      //
      // Revised from Phase 3.1 (which removed all seeding to fix a type/race
      // bug with id-only params). Phase 5's quote-first API gives us complete
      // objects with the right ids, so the lookup is reliable and the
      // Phase 3.1 race no longer applies.
      //
      // Single-live-session policy: only one headless session may be
      // active at a time. Starting a new one auto-cancels the previous,
      // matching the playground UX where tapping "Start" on a different
      // quote should swap the active flow.
      //
      // Close the previous session *before* seeding the controller: the
      // prior session's `onClose` may read controller state for logging, and
      // must still see the selections that applied to that session — not the
      // new quote's token/provider/payment method.
      const previousId = getActiveSessionId();
      if (previousId) {
        closeSession(previousId, { reason: 'consumer_cancelled' });
      }

      setSelectedToken(params.assetId);
      const matchedProvider =
        providers.find((p) => p.id === params.quote.providerInfo?.id) ?? null;
      setSelectedProvider(matchedProvider);
      const targetPaymentMethodId =
        params.paymentMethodId ?? params.quote.quote.paymentMethod;
      const matchedPaymentMethod =
        (paymentMethods ?? []).find((pm) => pm.id === targetPaymentMethodId) ??
        null;
      setSelectedPaymentMethod(matchedPaymentMethod);

      const session = createSession(params, callbacks);

      navigation.navigate(Routes.RAMP.HEADLESS_ENTRY, {
        screen: Routes.RAMP.TOKEN_SELECTION,
        params: {
          screen: Routes.RAMP.HEADLESS_HOST,
          params: {
            headlessSessionId: session.id,
          },
        },
      });

      return {
        sessionId: session.id,
        cancel: () => {
          closeSession(session.id, { reason: 'consumer_cancelled' });
        },
      };
    },
    [
      navigation,
      providers,
      paymentMethods,
      setSelectedToken,
      setSelectedProvider,
      setSelectedPaymentMethod,
    ],
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
    startHeadlessBuy,
    isLoading,
    errors,
  };
}

export default useHeadlessBuy;
