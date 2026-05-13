import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CaipChainId } from '@metamask/utils';
import type { RampsOrder } from '@metamask/ramps-controller';

import ReduxService from '../../../../core/redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { getRampCallbackBaseUrl } from '../utils/getRampCallbackBaseUrl';
import useRampsController from '../hooks/useRampsController';

import {
  closeSession,
  createSession,
  failSession,
  getActiveSessionId,
} from './sessionRegistry';
import {
  awaitOrderTerminalState as awaitOrderTerminalStateImperative,
  getOrder as getOrderImperative,
  refreshOrder as refreshOrderImperative,
  type AwaitOrderTerminalStateOptions,
  type RefreshOrderOptions,
} from './orderTerminalState';
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

/**
 * `useHeadlessBuy` is the public facade for driving the Unified Buy v2 flow
 * from outside the Ramp UI. It exposes catalog data (`tokens`, `providers`,
 * `paymentMethods`, `countries`, `userRegion`) for building consumer UIs on
 * top of the same data source the standard ramp surface uses; a quote
 * selection helper (`getQuotes`); session lifecycle primitives
 * (`startHeadlessBuy`, `errors`) that drive the three terminal callbacks
 * (`onOrderCreated`, `onError`, `onClose`) — see Phase 5 / 6 / 7 / 8 of the
 * plan; and Phase 9 order observation hooks (`getOrder`, `refreshOrder`,
 * `awaitOrderTerminalState`) for waiting on a fiat order to settle. The
 * imperative `awaitOrderTerminalState` is the load-bearing API for MetaMask
 * Pay's `TransactionPayController` so the second step of its two-step flow
 * can fire on settlement.
 *
 * Non-React consumers (e.g. controllers) should import the same imperative
 * functions from `app/components/UI/Ramp/headless/orderTerminalState.ts` —
 * the hook methods are thin passthroughs.
 *
 * @example Consumer-side TPC pattern
 * ```ts
 * import { RampsOrderStatus } from '@metamask/ramps-controller';
 *
 * const { startHeadlessBuy, awaitOrderTerminalState, getQuotes } = useHeadlessBuy();
 *
 * const quotes = await getQuotes({
 *   assetId: 'eip155:59144/erc20:0xaca…',
 *   amount: 25,
 *   paymentMethodIds: ['/payments/debit-credit-card'],
 * });
 * const quote = pickQuote(quotes); // consumer-owned selection
 *
 * startHeadlessBuy(
 *   { quote, assetId: quote.crypto.assetId, amount: 25 },
 *   {
 *     onOrderCreated: async (orderId, order) => {
 *       // Bridge the callback into a promise so the consumer can await
 *       // settlement. Pass `order.walletAddress` so the slow-path poll
 *       // works even in Engine controller contexts where the React-tree
 *       // unified order processor isn't load-bearing. Bound the wait —
 *       // an unbounded default + an order stuck in `Pending` would hang.
 *       const settled = await awaitOrderTerminalState(orderId, {
 *         walletAddress: order.walletAddress,
 *         timeoutMs: 5 * 60 * 1000,
 *       });
 *       if (settled.status === RampsOrderStatus.Completed) {
 *         await fireStepIIIntent(settled);
 *       }
 *       // Failed | Cancelled | IdExpired → consumer's failure path; the
 *       // headless API does NOT fire onError for a created-then-failed
 *       // order (see types.ts onOrderCreated JSDoc).
 *     },
 *     onError: (e) => surfaceError(e),
 *     onClose: ({ reason }) => trackClose(reason),
 *   },
 * );
 * ```
 *
 * Notes:
 * - Don't call `awaitOrderTerminalState` *before* `onOrderCreated` fires —
 *   the order won't exist yet, and without `options.walletAddress` the
 *   helper rejects immediately with `AwaitOrderTerminalStatePrerequisitesError`.
 * - `getOrder` is a synchronous read of redux state; `refreshOrder` is a
 *   network call that returns a fresh order without writing back to state.
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
      const quotesResponse = await getQuotesRaw({
        assetId: params.assetId,
        amount: params.amount,
        walletAddress,
        paymentMethods: params.paymentMethodIds,
        providers: params.providerIds,
        redirectUrl: params.redirectUrl ?? getRampCallbackBaseUrl(),
        forceRefresh: params.forceRefresh,
      });

      // Provider rejection: `success` is empty AND `error[]` is non-empty.
      // UB2 handles this at BuildQuote.tsx:683-687; headless mode previously
      // returned the raw response, so the consumer's `onError` never fired
      // and the consumer was stuck (Goktug's 5 EUR scenario). Inspect,
      // classify, route through the active session (Design B) and re-throw
      // so the consumer's `await getQuotes(...)` catch also receives the
      // structured error.
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

        // Prefer a structured `code` from the SDK; fall back to a
        // word-boundary regex on the combined message. Exclude rate/request
        // limit messages — those are 429-style API limits, not buy bounds.
        const messageHasLimitWord = /\b(minimum|maximum|limit)\b/i.test(
          combinedMessage,
        );
        const messageHasRateRequest = /\b(rate|request)\b/i.test(
          combinedMessage,
        );
        const sdkCodeSaysLimit = providerErrors.some(
          (p) => p.code !== undefined && /limit/i.test(p.code),
        );
        const sdkCodeSaysRateRequest = providerErrors.some(
          (p) => p.code !== undefined && /rate|request/i.test(p.code),
        );
        const isLimitExceeded =
          (sdkCodeSaysLimit && !sdkCodeSaysRateRequest) ||
          (messageHasLimitWord && !messageHasRateRequest);
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
        };

        // Design B: if a session is active, route the error through it so
        // `onError` + `onClose({ reason: 'unknown' })` fire and the session
        // is removed from the registry. Then re-throw so the consumer's
        // `await getQuotes(...)` catch also receives it.
        //
        // Caveat: `getActiveSessionId` returns the *first non-terminal*
        // session (sessionRegistry.ts), and `getQuotes` does NOT correlate
        // the rejected quote request with any specific session id. The
        // single-live-session invariant (enforced by `startHeadlessBuy`'s
        // auto-cancel at lines 200-203 below) makes this safe in practice
        // — there is at most one active session, so "the first" is "the
        // only." If a consumer registers a session and then calls
        // `getQuotes` again for an unrelated request that gets rejected,
        // that active session WILL be torn down. Document this clearly if
        // we ever expose a multi-session API.
        const activeId = getActiveSessionId();
        if (activeId) {
          failSession(activeId, error, code);
        }
        throw error;
      }

      return quotesResponse;
    },
    [getQuotesRaw],
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

      // The Headless Host is registered inside the Unified Buy v2 stack
      // (`app/components/UI/Ramp/routes.tsx` → `MainRoutes`) so it lives
      // next to every post-auth reset target (`Checkout`, `BasicInfo`,
      // `KycWebview`, …). From outside that stack we have to enter the
      // V2 stack via its outer mount point (`RAMP.TOKEN_SELECTION` in
      // `MainNavigator.js`, which renders `TokenListRoutes`) and hand
      // React Navigation a nested-screen descriptor:
      //   RAMP.TOKEN_SELECTION (outer)
      //     → RAMP.TOKEN_SELECTION (RootStack slot wrapping `MainRoutes`)
      //       → RAMP.HEADLESS_HOST (target screen on the inner stack)
      // Resetting the Host's nearest navigator (the `MainRoutes` inner
      // stack) then resolves all the `useTransakRouting` targets.
      navigation.navigate(Routes.RAMP.TOKEN_SELECTION, {
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

  // Phase 9 — order observation hook surface. Each method is a thin pass-
  // through to the module-level imperative twin in `orderTerminalState.ts`
  // so non-React consumers (e.g. MetaMask Pay's `TransactionPayController`)
  // can call into the exact same code path without going through React.
  const getOrder = useCallback(
    (providerOrderId: string): RampsOrder | undefined =>
      getOrderImperative(providerOrderId),
    [],
  );
  const refreshOrder = useCallback(
    (orderIdOrOrder: string | RampsOrder, options?: RefreshOrderOptions) =>
      refreshOrderImperative(orderIdOrOrder, options),
    [],
  );
  const awaitOrderTerminalState = useCallback(
    (
      providerOrderId: string,
      options?: AwaitOrderTerminalStateOptions,
    ): Promise<RampsOrder> =>
      awaitOrderTerminalStateImperative(providerOrderId, options),
    [],
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
    getOrder,
    refreshOrder,
    awaitOrderTerminalState,
    getQuotes,
    startHeadlessBuy,
    isLoading,
    errors,
  };
}

export default useHeadlessBuy;
