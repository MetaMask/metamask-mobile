import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { CaipChainId } from '@metamask/utils';
import { normalizeProviderCode } from '@metamask/ramps-controller';

import { strings } from '../../../../../locales/i18n';
import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';
import { selectHasAgreedTransakNativePolicy } from '../../../../reducers/fiatOrders';
import Device from '../../../../util/device';

import {
  buildQuoteWithRedirectUrl,
  getCheckoutContext,
  getWidgetRedirectConfig,
} from '../utils/buildQuoteWithRedirectUrl';
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
        providerCode = normalizeProviderCode(quote.provider);
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
        throw new Error(
          reportRampsError(
            new Error('No widget URL available for provider'),
            { provider: quote.provider },
            strings('deposit.buildQuote.unexpectedError'),
          ),
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

          const isAndroid = Device.isAndroid();
          const inAppBrowserAvailable =
            !isAndroid && (await InAppBrowser.isAvailable());

          if (isAndroid || !inAppBrowserAvailable) {
            await Linking.openURL(buyWidget.url);
            navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
            return;
          }

          try {
            const result = await InAppBrowser.openAuth(
              buyWidget.url,
              redirectUrl,
            );

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
      walletAddress,
      currency,
      navigation,
      getBuyWidgetData,
      addPrecreatedOrder,
      navigateAfterExternalBrowser,
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
