import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CaipChainId } from '@metamask/utils';
import type { Provider, RampsOrder } from '@metamask/ramps-controller';

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
 * A `(provider, paymentMethodId)` candidate that the pre-quote static bounds
 * check inspected. `bounds` is `undefined` when the provider's catalog entry
 * doesn't declare bounds for the given `(currency, paymentMethodId)` — we
 * treat that as "unknown" (cannot short-circuit) rather than "rejects."
 */
interface BoundsCandidate {
  providerId: string;
  paymentMethodId: string;
  bounds: ProviderBuyLimit | undefined;
}

/**
 * Pre-quote (no-network) bounds check used by `getQuotes`. Returns an
 * `Error` shaped for `toHeadlessBuyError` when **every** candidate pair
 * `(provider × paymentMethodId)` has known bounds AND the amount falls
 * outside those bounds. Otherwise returns `undefined` and the caller
 * proceeds with the normal network round-trip.
 *
 * "Every" is deliberate: a single "passes" or "unknown" candidate keeps
 * the network call in play, because that candidate might still produce a
 * valid quote. This mirrors UB2's behaviour — UB2 still asks the network
 * if it can't be certain, and only short-circuits when it's certain the
 * answer is "rejected."
 *
 * Skipped entirely (returns `undefined`) when:
 * - `amount` is `<= 0` or not finite — UB2 parity: `useProviderLimits.ts:30` returns `null` for `amount <= 0` so the UI shows no error while the user is still typing. We do the same so headless consumers can use `getQuotes` to "warm" the system without nuking a registered session.
 * - `providerIds` is missing/empty — caller asked for "any provider," no way to enumerate candidates without a network call.
 * - `paymentMethodIds` is missing/empty — same.
 * - `fiatCurrency` is missing — bounds are keyed by currency.
 * - `providers` catalog is empty — none of the requested ids are mappable.
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
      // Caller named a provider we don't have catalog entries for. Treat
      // as "unknown" — preserve today's behavior of letting the network
      // decide. (The network call will likely return an empty `success`
      // and a provider error, which Fix #2 already surfaces.)
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

  // Decision rule: short-circuit only when *every* candidate has bounds
  // AND those bounds reject the amount. A single "unknown" or "passes"
  // candidate keeps the network call alive.
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
 * - `getQuotes` runs a no-network static bounds check before the network
 *   call when `params.providerIds` is set: it consults
 *   `Provider.limits.fiat[currency][paymentMethodId]` from the already-
 *   loaded catalog and short-circuits with `LIMIT_EXCEEDED` if every
 *   candidate `(provider, paymentMethodId)` rejects `params.amount`. The
 *   same static lookup is exported as `getProviderBuyLimit` from
 *   `app/components/UI/Ramp/headless` for consumers that need it
 *   standalone (e.g. disabling a "Get quote" button as the user types).
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

      // Pre-quote (no-network) static bounds check. UB2 mirrors what users
      // would experience downstream by inspecting `Provider.limits.fiat[...]`
      // from the already-loaded provider catalog. When every candidate
      // `(provider × paymentMethodId)` definitively rejects `params.amount`,
      // we short-circuit with `LIMIT_EXCEEDED` instead of paying the network
      // round-trip. The function returns `undefined` (skip) when there's
      // any uncertainty — preserving today's behavior of letting the
      // network decide. See `buildStaticBoundsRejection` above for the
      // full decision rule.
      const fiatCurrency =
        params.currency ?? userRegion?.country?.currency ?? undefined;
      const staticRejection = buildStaticBoundsRejection({
        amount: params.amount,
        providerIds: params.providerIds,
        paymentMethodIds: params.paymentMethodIds,
        fiatCurrency,
        // `providers` is typed as `Provider[]` by `useRampsController` but
        // can be `null` while the catalog is loading; pass `[]` to keep
        // the helper's signature non-nullable and skip the check until
        // the catalog arrives.
        providers: providers ?? [],
      });
      if (staticRejection) {
        // Same Design B routing as the post-network rejection path: if a
        // session is active, run the error through `failSession` so
        // `onError` + `onClose({ reason: 'unknown' })` fire and the
        // session is removed from the registry. Then re-throw so the
        // consumer's `await getQuotes(...)` catch also receives it.
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
        //
        // Classification is **per-provider, then aggregated**: if provider A
        // returned a limit code and provider B returned a rate-limit code,
        // we should NOT let B's signal veto A's verdict. Aggregating with
        // `some()` across all errors (the previous shape) flipped this case
        // to `QUOTE_FAILED` even when at least one provider clearly hit a
        // buy bound — losing the actionable signal Goktug's 5 EUR scenario
        // depends on. Per-provider classification keeps each provider's
        // verdict scoped to its own code.
        const messageHasLimitWord = /\b(minimum|maximum|limit)\b/i.test(
          combinedMessage,
        );
        const messageHasRateRequest = /\b(rate|request)\b/i.test(
          combinedMessage,
        );
        const sdkSaysLimitForAnyProvider = providerErrors.some((p) => {
          if (p.code === undefined) return false;
          const codeSaysLimit = /limit/i.test(p.code);
          const codeSaysRateRequest = /rate|request/i.test(p.code);
          // This provider counts as a buy-limit signal only when its code
          // mentions limit AND not rate/request — verdicts don't leak
          // across providers.
          return codeSaysLimit && !codeSaysRateRequest;
        });
        const isLimitExceeded =
          sdkSaysLimitForAnyProvider ||
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
          // `source` discriminator parity with the static (pre-network) path
          // in `buildStaticBoundsRejection`. Lets consumers branch on
          // "which layer caught it" without sniffing for the presence of
          // `providerErrors` vs `rejections`.
          source: 'network-reject',
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
