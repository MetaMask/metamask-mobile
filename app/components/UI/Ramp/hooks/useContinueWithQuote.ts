import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { v4 as uuidv4 } from 'uuid';
import type { CaipChainId } from '@metamask/utils';

import { strings } from '../../../../../locales/i18n';
import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { selectHasAgreedTransakNativePolicy } from '../../../../reducers/fiatOrders';
import Device from '../../../../util/device';

import {
  buildQuoteWithRedirectUrl,
  getCheckoutContext,
  getWidgetRedirectConfig,
} from '../utils/buildQuoteWithRedirectUrl';
import {
  clearExternalReturnCorrelation,
  completeHeadlessExternalReturn,
  emitExternalCheckoutClosed,
  emitExternalOrderFailed,
  getExternalReturnCorrelation,
  recordExternalReturnCorrelation,
} from '../headless/externalBrowserReturn';
import { dismissHeadlessFlow } from '../headless/headlessEntryNavigation';
import {
  closeSession,
  failSession,
  getSession,
} from '../headless/sessionRegistry';
import { getNavigateAfterExternalBrowserRoutes } from '../utils/rampsNavigation';
import { reportRampsError } from '../utils/reportRampsError';
import {
  type Quote,
  isNativeProvider,
  isCustomAction,
  getQuoteProviderName,
  getQuoteBuyUserAgent,
} from '../types';
import { createCheckoutNavDetails } from '../Views/Checkout';
import { createV2EnterEmailNavDetails } from '../Views/NativeFlow/EnterEmail';
import { createV2VerifyIdentityNavDetails } from '../Views/NativeFlow/VerifyIdentity';

import { useRampsController } from './useRampsController';
import { useTransakController } from './useTransakController';
import { useTransakRouting } from './useTransakRouting';
import useRampAccountAddress from './useRampAccountAddress';

export interface ContinueWithQuoteContext {
  amount: number;
  assetId: string;
  /**
   * Optional overrides for callers that don't seed the controller (e.g. the
   * headless flow's Host screen). When omitted, each field falls back to the
   * value derived from `useRampsController` selections — so BuildQuote
   * keeps its existing behavior unchanged. When supplied, the override
   * wins for the duration of this call only.
   */
  chainId?: CaipChainId;
  walletAddress?: string;
  /** Fiat currency code, e.g. `'USD'`. */
  currency?: string;
  /** Crypto symbol used for Checkout WebView's display label. */
  cryptoSymbol?: string;
  /** Payment method id used for the native Transak quote fetch. */
  paymentMethodId?: string;
  /** Provider display name used for Checkout WebView's `providerName`. */
  providerName?: string;
  /**
   * When set, the native (Transak) auth-loop screens (VerifyIdentity →
   * EnterEmail → OtpCode) will carry this id and route post-auth resets
   * back to `Routes.RAMP.HEADLESS_HOST` instead of BuildQuote. The widget
   * branch uses it to route external-browser outcomes to the session's
   * terminal callbacks instead of resetting to BuildQuote (P2.M1).
   */
  headlessSessionId?: string;
  /**
   * Optional redirect-URL override (threaded from
   * `HeadlessBuyParams.redirectUrl`). The mobile redirect-policy util
   * (`getWidgetRedirectConfig`) stays the source of truth; when this is set
   * it wins for both the quote's buy URL and the browser interception
   * scheme. External-browser quotes rely on the `metamask://on-ramp`
   * deeplink for return detection, so overriding it on an external quote is
   * the caller's responsibility.
   */
  redirectUrl?: string;
}

export interface UseContinueWithQuoteOptions {
  /**
   * Forwarded to the inner `useTransakRouting` instance. Lets the headless
   * Host pin the stack base for post-auth resets onto
   * `Routes.RAMP.HEADLESS_HOST` so the auth loop returns to the Host
   * instead of BuildQuote (which a headless caller never opened).
   */
  transakRouting?: {
    baseRoute?: string;
    baseRouteParams?: Record<string, unknown>;
  };
}

export interface UseContinueWithQuoteResult {
  /**
   * Advances the buy flow for a given quote. Native (Transak) quotes check
   * authentication and either route through the post-auth flow or navigate
   * into EnterEmail / VerifyIdentity. Widget / aggregator quotes fetch the
   * widget URL and either open it in-app (Checkout WebView) or delegate to
   * an external browser.
   *
   * Error contract: on failure the hook calls `reportRampsError` (Logger +
   * Sentry side effect) and throws an `Error` whose `message` is a
   * user-facing string suitable for direct display. Callers should catch
   * and surface that message in their own UI.
   *
   * The hook does not manage loading state or fire the
   * RAMPS_CONTINUE_BUTTON_CLICKED analytics event — those stay with the
   * caller.
   */
  continueWithQuote: (
    quote: Quote,
    context: ContinueWithQuoteContext,
  ) => Promise<void>;
}

/**
 * Tags a user-facing Error so `toHeadlessBuyError` classifies it as
 * `QUOTE_FAILED` (technical checkout failure: widget URL, external open,
 * order lookup) instead of the `UNKNOWN` fallback (P2.M7). Headless-scoped:
 * the property is inert for non-headless callers, but only attaching it under
 * a session keeps the UB2 path provably byte-identical.
 */
function tagHeadlessQuoteFailure(error: Error, isHeadless: boolean): Error {
  if (isHeadless) {
    (error as Error & { headlessBuyErrorCode?: string }).headlessBuyErrorCode =
      'QUOTE_FAILED';
  }
  return error;
}

export function useContinueWithQuote(
  options?: UseContinueWithQuoteOptions,
): UseContinueWithQuoteResult {
  const navigation = useNavigation();
  const {
    selectedToken,
    selectedProvider,
    selectedPaymentMethod,
    userRegion,
    getBuyWidgetData,
    addPrecreatedOrder,
  } = useRampsController();
  const {
    checkExistingToken: transakCheckExistingToken,
    getBuyQuote: transakGetBuyQuote,
  } = useTransakController();
  const { routeAfterAuthentication: transakRouteAfterAuth } = useTransakRouting(
    options?.transakRouting,
  );
  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );
  const hasAgreedTransakNativePolicy = useSelector(
    selectHasAgreedTransakNativePolicy,
  );

  const currency = userRegion?.country?.currency || 'USD';

  const navigateAfterExternalBrowser = useCallback(
    (opts: Parameters<typeof getNavigateAfterExternalBrowserRoutes>[0]) => {
      navigation.reset({
        index: 0,
        routes: getNavigateAfterExternalBrowserRoutes(opts),
      });
    },
    [navigation],
  );

  // The aggregator-format `_quote` is used only by the caller to dispatch
  // to this branch via `isNativeProvider`. The native (Transak) path fetches
  // its own `TransakBuyQuote` via `transakGetBuyQuote` below.
  const continueNative = useCallback(
    async (_quote: Quote, ctx: ContinueWithQuoteContext) => {
      const { amount, assetId } = ctx;
      // Resolve every controller-coupled value through the override-first
      // ladder so headless callers (Phase 5) can drive this hook without
      // pre-seeding the RampsController.
      const effectiveCurrency = ctx.currency ?? currency;
      const effectiveChainId = ctx.chainId ?? selectedToken?.chainId ?? '';
      const effectivePaymentMethodId =
        ctx.paymentMethodId ?? selectedPaymentMethod?.id ?? '';
      // The native Transak quote fetch requires a payment method. An empty
      // value gets dropped from the request query and Transak rejects it with
      // HTTP 400, so fail fast with a reported error instead of issuing a
      // request that can never succeed.
      //
      // Gate on `ctx.headlessSessionId` so this guard is scoped to the
      // headless buy flow. The shared UB2 path (BuildQuote ->
      // continueWithQuote -> continueNative) never sets `headlessSessionId`,
      // so its behavior is provably unchanged.
      if (!effectivePaymentMethodId && ctx.headlessSessionId) {
        throw new Error(
          reportRampsError(
            new Error('Native provider flow requires a payment method'),
            { message: 'Missing payment method for native provider flow' },
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
      }
      try {
        const hasToken = await transakCheckExistingToken();

        if (hasToken) {
          const transakQuote = await transakGetBuyQuote(
            effectiveCurrency,
            assetId,
            effectiveChainId,
            effectivePaymentMethodId,
            String(amount),
          );
          if (!transakQuote) {
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
          }
          await transakRouteAfterAuth(transakQuote, amount);
        } else if (hasAgreedTransakNativePolicy) {
          navigation.navigate(
            ...createV2EnterEmailNavDetails({
              amount: String(amount),
              currency: effectiveCurrency,
              assetId,
              headlessSessionId: ctx.headlessSessionId,
            }),
          );
        } else {
          navigation.navigate(
            ...createV2VerifyIdentityNavDetails({
              amount: String(amount),
              currency: effectiveCurrency,
              assetId,
              headlessSessionId: ctx.headlessSessionId,
            }),
          );
        }
      } catch (error) {
        throw new Error(
          reportRampsError(
            error,
            { message: 'Failed to route native provider flow' },
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
      }
    },
    [
      currency,
      selectedToken?.chainId,
      selectedPaymentMethod?.id,
      transakCheckExistingToken,
      transakGetBuyQuote,
      transakRouteAfterAuth,
      navigation,
      hasAgreedTransakNativePolicy,
    ],
  );

  const continueWidget = useCallback(
    async (quote: Quote, ctx: ContinueWithQuoteContext) => {
      // See `continueNative` — every controller-coupled value resolves
      // through the override-first ladder so headless callers can drive the
      // widget branch without touching the controller.
      const effectiveCurrency = ctx.currency ?? currency;
      const effectiveWalletAddress = ctx.walletAddress ?? walletAddress;
      const effectiveCryptoSymbol =
        ctx.cryptoSymbol ?? selectedToken?.symbol ?? '';
      const effectiveChainId = ctx.chainId ?? selectedToken?.chainId;
      const effectiveProviderName =
        ctx.providerName ??
        selectedProvider?.name ??
        getQuoteProviderName(quote);

      let providerCode: string;
      let useExternalBrowser: boolean;
      let redirectUrl: string;
      let buyWidget: Awaited<ReturnType<typeof getBuyWidgetData>>;
      try {
        providerCode = quote.provider;
        const isCustom = isCustomAction(quote);
        const redirectConfig = getWidgetRedirectConfig(
          quote,
          providerCode,
          isCustom,
        );
        useExternalBrowser = redirectConfig.useExternalBrowser;
        // The redirect-policy util is the source of truth; a caller-supplied
        // override (HeadlessBuyParams.redirectUrl via the Host) wins when
        // present, and the same value feeds both the quote's buy URL and the
        // browser interception scheme so they cannot diverge (P2.M1).
        redirectUrl = ctx.redirectUrl ?? redirectConfig.redirectUrl;
        const quoteForWidget = buildQuoteWithRedirectUrl(quote, redirectUrl);
        buyWidget = await getBuyWidgetData(quoteForWidget);
      } catch (error) {
        throw tagHeadlessQuoteFailure(
          new Error(
            reportRampsError(
              error,
              {
                provider: quote.provider,
                message: 'Failed to fetch widget URL',
              },
              strings('deposit.buildQuote.unexpectedError'),
            ),
          ),
          Boolean(ctx.headlessSessionId),
        );
      }

      if (!buyWidget?.url) {
        throw tagHeadlessQuoteFailure(
          new Error(
            reportRampsError(
              new Error('No widget URL available for provider'),
              { provider: quote.provider },
              strings('deposit.buildQuote.unexpectedError'),
            ),
          ),
          Boolean(ctx.headlessSessionId),
        );
      }

      try {
        const { network, effectiveWallet, effectiveOrderId } =
          getCheckoutContext(
            { chainId: effectiveChainId },
            effectiveWalletAddress,
            buyWidget.orderId,
          );

        if (useExternalBrowser) {
          if (effectiveOrderId && effectiveWallet) {
            addPrecreatedOrder({
              orderId: effectiveOrderId,
              providerCode,
              walletAddress: effectiveWallet,
              chainId: network || undefined,
            });
          }

          const headlessId = ctx.headlessSessionId;
          const headlessSession = getSession(headlessId);
          if (headlessId) {
            if (!headlessSession) {
              // The session terminated before launch (consumer cancel /
              // dismissal race). Opening a browser for a dead session would
              // orphan the return; bail without navigating.
              return;
            }
            if (!effectiveWallet) {
              // The return leg (callback resolution) is impossible without a
              // wallet address; fail fast instead of launching a browser
              // whose success could never be resolved into an order. Marked
              // as already-reported so the outer catch rethrows it unchanged
              // instead of double-reporting to Sentry.
              const noWalletError = tagHeadlessQuoteFailure(
                new Error(
                  reportRampsError(
                    new Error(
                      'No wallet address available for external browser flow',
                    ),
                    { provider: quote.provider },
                    strings('deposit.buildQuote.unexpectedError'),
                  ),
                ),
                true,
              ) as Error & { rampsErrorReported?: boolean };
              noWalletError.rampsErrorReported = true;
              throw noWalletError;
            }
            // P2.M2/E2: correlate the deeplink return with this session. The
            // record retains `onOrderCreated` so a success return can
            // complete the order even after the session is dismissed.
            recordExternalReturnCorrelation({
              sessionId: headlessId,
              providerCode,
              walletAddress: effectiveWallet,
              chainId: network || undefined,
              orderId: effectiveOrderId ?? undefined,
              rampSurface: headlessSession.params.rampSurface,
              region: userRegion?.regionCode ?? undefined,
              analytics: {
                checkoutSessionId: effectiveOrderId ?? uuidv4(),
                providerName: effectiveProviderName,
                amountSource: Number(
                  quote.quote?.amountIn ?? headlessSession.params.amount ?? 0,
                ),
                amountDestination: Number(quote.quote?.amountOut ?? 0),
                paymentMethodId: quote.quote?.paymentMethod ?? '',
                currencySource: effectiveCurrency,
                currencyDestination: effectiveCryptoSymbol,
              },
              onOrderCreated: headlessSession.callbacks.onOrderCreated,
              launchedAt: Date.now(),
            });
          }

          const isAndroid = Device.isAndroid();
          const inAppBrowserAvailable =
            !isAndroid && (await InAppBrowser.isAvailable());

          if (isAndroid || !inAppBrowserAvailable) {
            try {
              await Linking.openURL(buyWidget.url);
            } catch (openError) {
              // Only the OPEN failure is catchable here; page load is
              // unobservable. Clear the correlation (nothing will return)
              // and let the outer catch route the typed failure.
              clearExternalReturnCorrelation(headlessId);
              throw openError;
            }
            if (headlessId) {
              // Headless: leave the session `continued` and the Host overlay
              // mounted (touch-through). Success arrives via the
              // `metamask://on-ramp` deeplink (handleRampReturnUrl); an
              // abandoned session ends only via hardware back on the Host, a
              // new startHeadlessBuy, consumer cancel(), or the 1-hour stale
              // GC — and a paid-but-never-returned order still reconciles
              // through the persisted Precreated stub + order polling.
              return;
            }
            navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
            return;
          }

          try {
            let result: Awaited<ReturnType<typeof InAppBrowser.openAuth>>;
            try {
              result = await InAppBrowser.openAuth(buyWidget.url, redirectUrl);
            } catch (openError) {
              // The auth session failed to open/resolve: the session will end
              // in onError (outer catch -> Host failSession), after which a
              // late onOrderCreated must be impossible — drop the correlation.
              clearExternalReturnCorrelation(headlessId);
              throw openError;
            }

            if (headlessId) {
              // P2.M1: resolve every openAuth outcome into a terminal
              // session callback instead of resetting to BuildQuote. Only
              // the path that actually terminates the session may pop the
              // overlay — a newer session may own it by now.
              const ownCorrelation = getExternalReturnCorrelation(headlessId);

              if (result.type !== 'success' || !result.url) {
                // User closed the browser sheet: a user exit, not an error.
                // Once the auth session is closed no deeplink can follow, so
                // the correlation is dead weight — drop it.
                if (ownCorrelation) {
                  emitExternalCheckoutClosed(
                    ownCorrelation,
                    'external_browser_cancel',
                    false,
                  );
                }
                clearExternalReturnCorrelation(headlessId);
                const hadLiveSession = Boolean(getSession(headlessId));
                closeSession(headlessId, { reason: 'user_dismissed' });
                if (hadLiveSession) {
                  dismissHeadlessFlow(navigation);
                }
                return;
              }

              try {
                const completedOrder = await completeHeadlessExternalReturn({
                  sessionId: headlessId,
                  providerCode,
                  walletAddress: effectiveWallet,
                  returnUrl: result.url,
                  orderIdFallback: effectiveOrderId ?? undefined,
                  rampSurface: headlessSession?.params.rampSurface,
                  region: userRegion?.regionCode ?? undefined,
                });
                if (completedOrder) {
                  dismissHeadlessFlow(navigation);
                }
                // null: another path (deeplink) already completed this
                // session and owns the teardown — do not double-dismiss.
              } catch (completionError) {
                if (ownCorrelation) {
                  emitExternalOrderFailed(ownCorrelation, completionError);
                }
                clearExternalReturnCorrelation(headlessId);
                if (failSession(headlessId, completionError, 'QUOTE_FAILED')) {
                  dismissHeadlessFlow(navigation);
                }
              }
              return;
            }

            if (result.type !== 'success' || !result.url) {
              navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
              return;
            }

            if (!effectiveWallet) {
              navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
              return;
            }

            navigateAfterExternalBrowser({
              returnDestination: 'order',
              callbackUrl: result.url,
              providerCode,
              walletAddress: effectiveWallet,
            });
          } finally {
            InAppBrowser.closeAuth();
          }
          return;
        }

        navigation.navigate(
          ...createCheckoutNavDetails({
            url: buyWidget.url,
            providerName: effectiveProviderName,
            userAgent: getQuoteBuyUserAgent(quote),
            providerCode,
            providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
            walletAddress: effectiveWallet || undefined,
            network,
            currency: effectiveCurrency,
            cryptocurrency: effectiveCryptoSymbol,
            orderId: buyWidget.orderId?.trim() || undefined,
            headlessSessionId: ctx.headlessSessionId,
          }),
        );
      } catch (error) {
        if ((error as { rampsErrorReported?: boolean })?.rampsErrorReported) {
          // Already reported (and user-facing) at the throw site.
          throw error;
        }
        throw tagHeadlessQuoteFailure(
          new Error(
            reportRampsError(
              error,
              {
                provider: quote.provider,
                message: 'Failed to open widget',
              },
              strings('deposit.buildQuote.unexpectedError'),
            ),
          ),
          Boolean(ctx.headlessSessionId),
        );
      }
    },
    [
      selectedProvider,
      selectedToken,
      walletAddress,
      currency,
      navigation,
      getBuyWidgetData,
      addPrecreatedOrder,
      navigateAfterExternalBrowser,
      userRegion?.regionCode,
    ],
  );

  const continueWithQuote = useCallback(
    async (quote: Quote, context: ContinueWithQuoteContext) => {
      if (isNativeProvider(quote)) {
        await continueNative(quote, context);
        return;
      }
      await continueWidget(quote, context);
    },
    [continueNative, continueWidget],
  );

  return { continueWithQuote };
}

export default useContinueWithQuote;
