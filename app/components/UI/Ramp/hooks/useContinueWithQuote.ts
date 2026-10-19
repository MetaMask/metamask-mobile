import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';

import { strings } from '../../../../../locales/i18n';
import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { selectHasAgreedTransakNativePolicy } from '../../../../reducers/fiatOrders';

import {
  buildQuoteWithRedirectUrl,
  getCheckoutContext,
  getWidgetRedirectConfig,
} from '../utils/buildQuoteWithRedirectUrl';
import { reportRampsError } from '../utils/reportRampsError';
import { isMonadMusdAssetId } from '../utils/fiatDepositAsset';
import {
  acceptedAmountMatchesRequest,
  logTransakQuoteMismatch,
} from '../utils/transakQuoteParity';
import {
  checkGooglePayAvailability,
  needsGooglePayPreflight,
} from '../utils/googlePayAvailability';
import { getBuyWidgetFallback } from '@metamask/ramps-controller';
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
import { useOpenHostedBuyWidget } from './useOpenHostedBuyWidget';
import {
  endOpenRampsBuyCufChildrenByName,
  endRampsBuyCufChildTrace,
  startRampsBuyCufChildTrace,
} from '../utils/rampsBuyCufTrace';
import {
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_PATH,
  RAMPS_BUY_CUF_TAG,
} from '../constants/rampsBuyCufTags';
import { TraceName } from '../../../../util/trace';

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
   * back to `Routes.RAMP.HEADLESS_HOST` instead of BuildQuote. Ignored
   * by the widget branch (no auth loop there).
   */
  headlessSessionId?: string;
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

export function useContinueWithQuote(
  options?: UseContinueWithQuoteOptions,
): UseContinueWithQuoteResult {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    selectedToken,
    selectedProvider,
    selectedPaymentMethod,
    userRegion,
    getBuyWidgetData,
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
  const { openHostedBuyWidget } = useOpenHostedBuyWidget();

  const currency = userRegion?.country?.currency || 'USD';

  // The aggregator-format quote is used only by the caller to dispatch
  // to this branch via `isNativeProvider`. The native (Transak) path fetches
  // its own `TransakBuyQuote` via `transakGetBuyQuote` below.
  const continueNative = useCallback(
    async (quote: Quote, ctx: ContinueWithQuoteContext) => {
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
      endOpenRampsBuyCufChildrenByName(TraceName.RampBuyNativeToOrderCreated, {
        [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
        [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
      });
      const nativeCufOpId = startRampsBuyCufChildTrace({
        name: TraceName.RampBuyNativeToOrderCreated,
        tags: { [RAMPS_BUY_CUF_TAG.PATH]: RAMPS_BUY_CUF_PATH.NATIVE },
      });
      try {
        const hasToken = await transakCheckExistingToken();

        if (hasToken) {
          const quoteArguments = [
            effectiveCurrency,
            assetId,
            effectiveChainId,
            effectivePaymentMethodId,
            String(amount),
          ] as const;
          // Fee-on-top: request the native quote with the default fee mode
          // (the fee is added on top of the amount).
          const transakQuote = await transakGetBuyQuote(...quoteArguments);
          if (!transakQuote) {
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
          }
          await transakRouteAfterAuth(transakQuote, amount);
        } else if (hasAgreedTransakNativePolicy) {
          navigateWithDetails(
            navigation,
            createV2EnterEmailNavDetails({
              amount: String(amount),
              currency: effectiveCurrency,
              assetId,
              headlessSessionId: ctx.headlessSessionId,
            }),
          );
        } else {
          navigateWithDetails(
            navigation,
            createV2VerifyIdentityNavDetails({
              amount: String(amount),
              currency: effectiveCurrency,
              assetId,
              headlessSessionId: ctx.headlessSessionId,
            }),
          );
        }
      } catch (error) {
        if (nativeCufOpId) {
          endRampsBuyCufChildTrace({
            id: nativeCufOpId,
            data: {
              [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
              [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ERROR,
            },
          });
        }
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
      endOpenRampsBuyCufChildrenByName(TraceName.RampBuyContinueToCheckout, {
        [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
        [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
      });
      const checkoutCufOpId = startRampsBuyCufChildTrace({
        name: TraceName.RampBuyContinueToCheckout,
        tags: { [RAMPS_BUY_CUF_TAG.PATH]: RAMPS_BUY_CUF_PATH.WIDGET },
      });
      const endCheckoutCuf = (success: boolean, reason?: string) => {
        if (!checkoutCufOpId) {
          return;
        }
        endRampsBuyCufChildTrace({
          id: checkoutCufOpId,
          data: {
            [RAMPS_BUY_CUF_TAG.SUCCESS]: success,
            ...(reason ? { [RAMPS_BUY_CUF_TAG.REASON]: reason } : {}),
          },
        });
      };
      // Some embedded pages go silent when Google Pay can't pay in the WebView,
      // so ask Play Services before reserving an order. Only an explicit "no" stops.
      const effectivePaymentMethodId =
        quote.quote?.paymentMethod ??
        ctx.paymentMethodId ??
        selectedPaymentMethod?.id;
      if (needsGooglePayPreflight(quote.provider, effectivePaymentMethodId)) {
        const availability = await checkGooglePayAvailability();
        if (availability === 'unavailable') {
          endCheckoutCuf(false, RAMPS_BUY_CUF_END_REASON.BAILED);
          throw new Error(
            strings('fiat_on_ramp_aggregator.google_pay_unavailable'),
          );
        }
      }

      try {
        providerCode = quote.provider;
        if (
          ctx.headlessSessionId &&
          isMonadMusdAssetId(ctx.assetId) &&
          !acceptedAmountMatchesRequest(quote, ctx.amount)
        ) {
          logTransakQuoteMismatch(['fiat_amount']);
        }
        const isCustom = isCustomAction(quote);
        const redirectConfig = getWidgetRedirectConfig(
          quote,
          providerCode,
          isCustom,
        );
        useExternalBrowser = redirectConfig.useExternalBrowser;
        redirectUrl = redirectConfig.redirectUrl;
        const quoteForWidget = buildQuoteWithRedirectUrl(quote, redirectUrl);
        buyWidget = await getBuyWidgetData(quoteForWidget);
      } catch (error) {
        endCheckoutCuf(false, RAMPS_BUY_CUF_END_REASON.ERROR);
        throw new Error(
          reportRampsError(
            error,
            {
              provider: quote.provider,
              message: 'Failed to fetch widget URL',
            },
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
      }

      if (!buyWidget?.url) {
        endCheckoutCuf(false, RAMPS_BUY_CUF_END_REASON.ERROR);
        throw new Error(
          reportRampsError(
            new Error('No widget URL available for provider'),
            { provider: quote.provider },
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
      }

      endCheckoutCuf(true);

      try {
        if (useExternalBrowser) {
          await openHostedBuyWidget({
            url: buyWidget.url,
            redirectUrl,
            providerCode,
            orderId: buyWidget.orderId,
            walletAddress: effectiveWalletAddress,
            chainId: effectiveChainId,
          });
          return;
        }

        const { network, effectiveWallet } = getCheckoutContext(
          { chainId: effectiveChainId },
          effectiveWalletAddress,
          buyWidget.orderId,
        );

        navigateWithDetails(
          navigation,
          createCheckoutNavDetails({
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
            fallbackBuyWidget: getBuyWidgetFallback(quote),
          }),
        );
      } catch (error) {
        throw new Error(
          reportRampsError(
            error,
            {
              provider: quote.provider,
              message: 'Failed to open widget',
            },
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
      }
    },
    [
      selectedProvider,
      selectedToken,
      selectedPaymentMethod?.id,
      walletAddress,
      currency,
      navigation,
      getBuyWidgetData,
      openHostedBuyWidget,
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
