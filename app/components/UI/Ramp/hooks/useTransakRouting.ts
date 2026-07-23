import { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  navigateWithDetails,
  resetWithRoutes,
} from '../../../../util/navigation/navUtils';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  RampsEnvironment,
  RampsOrderStatus,
  type TransakBuyQuote,
} from '@metamask/ramps-controller';
import { getRampsEnvironment } from '../../../../core/Engine/controllers/ramps-controller/ramps-service-init';
import { REDIRECTION_URL } from '../constants';
import { generateThemeParameters } from '../utils/depositUtils';
import type {
  AddressFormData,
  BasicInfoFormData,
} from '../types/transakNativeForms';
import { createCheckoutNavDetails } from '../Views/Checkout';
import { createV2EnterEmailNavDetails } from '../Views/NativeFlow/EnterEmail';
import { createKycWebviewNavDetails } from '../Views/NativeFlow/KycWebview';
import useAnalytics from './useAnalytics';
import { showV2OrderToast } from '../utils/v2OrderToast';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import { useTransakController } from './useTransakController';
import { useRampsUserRegion } from './useRampsUserRegion';
import { useRampsPaymentMethods } from './useRampsPaymentMethods';
import { useRampsProviders } from './useRampsProviders';
import { selectTokens } from '../../../../selectors/rampsController';
import useRampAccountAddress from './useRampAccountAddress';
import { isHttpUnauthorized } from '../utils/isHttpUnauthorized';
import { parseUserFacingError } from '../utils/parseUserFacingError';
import { useRampsOrders } from './useRampsOrders';
import {
  closeSession,
  failSession,
  getSession,
} from '../headless/sessionRegistry';
import { dismissHeadlessFlow } from '../headless/headlessEntryNavigation';
import { getChainIdFromAssetId } from '../headless';
import { setHeadlessOrderContext } from '../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry';
import { emitTerminalOrderAnalyticsFromCallback } from '../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics';

// The fallback provider code must match the environment that `refreshOrder`
// polls, which is derived from `getRampsEnvironment()`. Using the Transak
// environment here could disagree with the ramps API env (they read different
// env vars) and poll the wrong provider, returning a 400.
function getFallbackNativeProviderCode(): string {
  return getRampsEnvironment() === RampsEnvironment.Staging
    ? 'transak-native-staging'
    : 'transak-native';
}

interface RampStackParamList {
  /** `baseRouteParams` (e.g. `headlessSessionId`) are merged onto this route in resets — see `navigateToVerifyIdentityCallback`. */
  RampVerifyIdentity: {
    quote: TransakBuyQuote;
    headlessSessionId?: string;
    amount?: string;
    currency?: string;
    assetId?: string;
  };
  /** `baseRouteParams` are merged here too — see `navigateToBasicInfoCallback`. */
  RampBasicInfo: {
    quote: TransakBuyQuote;
    previousFormData?: BasicInfoFormData & AddressFormData;
    headlessSessionId?: string;
    amount?: string;
    currency?: string;
    assetId?: string;
  };
  RampBankDetails: { orderId: string; shouldUpdate?: boolean };
  RampOrderProcessing: { orderId: string };
  RampAdditionalVerification: {
    quote: TransakBuyQuote;
    kycUrl: string;
    workFlowRunId: string;
    /** User-entered fiat from BuildQuote; used when resetting stack so amount screen keeps the typed value. */
    amount?: number;
  };
  RampKycProcessing: { headlessSessionId?: string } | undefined;
  RampEnterEmail: undefined;
  Checkout: {
    url: string;
    providerName: string;
    userAgent?: string;
    onNavigationStateChange?: (navState: { url: string }) => void;
  };
  [key: string]: object | undefined;
}

class LimitExceededError extends Error {
  readonly headlessBuyErrorCode = 'LIMIT_EXCEEDED';

  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'LimitExceededError';
    this.details = details;
  }
}

interface UseTransakRoutingConfig {
  screenLocation?: string;
  /**
   * Stack base route for navigation resets done after auth/KYC. Defaults to
   * `Routes.RAMP.AMOUNT_INPUT` (BuildQuote) — that's what the regular
   * Unified Buy v2 flow expects today.
   *
   * Headless callers (Phase 5) override this to `Routes.RAMP.HEADLESS_HOST`
   * so post-auth resets land back on the Host instead of dropping the user
   * onto BuildQuote, which a headless consumer never opened.
   */
  baseRoute?: string;
  /**
   * Static params for the stack base route. For BuildQuote we still want to
   * keep the per-call `amount` thread (so the input is pre-filled after a
   * reset) — that's the default behavior. For the Host we pass
   * `{ headlessSessionId }` so the Host can re-pick up the live session
   * after a reset.
   */
  baseRouteParams?: Record<string, unknown>;
}

export const useTransakRouting = (config?: UseTransakRoutingConfig) => {
  const baseRoute = config?.baseRoute;
  const baseRouteParams = config?.baseRouteParams;
  // Headless-mode marker extracted from the caller's config. When the
  // Host wires `baseRouteParams: { headlessSessionId }` through, this
  // lets post-checkout success paths hand the orderId to the session's
  // `onOrderCreated` callback and unwind the ramp stack instead of
  // resetting to `RAMPS_ORDER_DETAILS`.
  const headlessSessionId = (
    baseRouteParams as { headlessSessionId?: string } | undefined
  )?.headlessSessionId;
  // Composes the stack base entry used by `navigation.reset` calls below.
  // - When the caller didn't override `baseRoute`, we keep BuildQuote as the
  //   base and merge the per-call `amount` (so the input is pre-filled when
  //   the user lands back).
  // - When `baseRoute` was overridden (headless flow's HEADLESS_HOST), we
  //   pass the static `baseRouteParams` as-is — `amount` is irrelevant
  //   because the Host carries the full quote on `session.params.quote`.
  const buildBaseRouteEntry = useCallback(
    ({ amount }: { amount?: number }) => {
      if (baseRoute) {
        return {
          name: baseRoute,
          params: baseRouteParams,
        };
      }
      return {
        name: Routes.RAMP.AMOUNT_INPUT,
        params: { amount, ...(baseRouteParams ?? {}) },
      };
    },
    [baseRoute, baseRouteParams],
  );
  const navigation = useNavigation<AppNavigationProp>();
  const { themeAppearance, colors } = useTheme();
  const trackEvent = useAnalytics();
  const processingOrderIdRef = useRef<string | null>(null);
  const { addOrder, refreshOrder } = useRampsOrders();

  const dismissActiveHeadlessFlow = useCallback(() => {
    dismissHeadlessFlow(navigation);
  }, [navigation]);

  const {
    logoutFromProvider,
    getUserDetails,
    getKycRequirement,
    getAdditionalRequirements,
    createOrder: transakCreateOrder,
    getOrder,
    getUserLimits,
    requestOtt,
    generatePaymentWidgetUrl,
    submitPurposeOfUsageForm,
  } = useTransakController();

  const { userRegion } = useRampsUserRegion();
  const { selectedPaymentMethod } = useRampsPaymentMethods();
  const { selectedProvider } = useRampsProviders();

  const { selected: selectedToken } = useSelector(selectTokens);
  const headlessSessionParams = getSession(headlessSessionId)?.params;
  const headlessAssetId = headlessSessionParams?.assetId;
  const walletAddressChainId =
    (headlessAssetId ? getChainIdFromAssetId(headlessAssetId) : null) ??
    (selectedToken?.chainId as CaipChainId | undefined);
  const resolvedWalletAddress = useRampAccountAddress(walletAddressChainId);
  const walletAddress =
    headlessSessionParams?.walletAddress ?? resolvedWalletAddress;

  const fiatCurrency = userRegion?.country?.currency || '';
  const regionIsoCode = userRegion?.regionCode || '';

  /**
   * Emits HEADLESS `RAMPS_ORDER_FAILED` for headless buy failures (TRAM-3623
   * §7): `failSession` (non-React) can't emit, so this host does, around that
   * call. No-op without a live session; `quote` (when in scope) seeds amount.
   */
  const emitHeadlessOrderFailed = useCallback(
    (error: unknown, quote?: TransakBuyQuote, providerOrderId?: string) => {
      const session = getSession(headlessSessionId);
      if (!session) {
        return;
      }
      trackEvent('RAMPS_ORDER_FAILED', {
        ramp_type: 'HEADLESS',
        ramp_surface: session.params?.rampSurface,
        // TRAM-3696: present when the failure occurs after an order exists.
        ...(providerOrderId && { provider_order_id: providerOrderId }),
        amount_source: Number(quote?.fiatAmount ?? session.params?.amount ?? 0),
        amount_destination: 0,
        payment_method_id: selectedPaymentMethod?.id || '',
        region: regionIsoCode,
        chain_id: (selectedToken?.chainId as string) || '',
        currency_destination: selectedToken?.assetId || '',
        currency_destination_symbol: selectedToken?.symbol || undefined,
        currency_source: quote?.fiatCurrency || fiatCurrency || '',
        error_message: parseUserFacingError(
          error,
          strings('deposit.buildQuote.unexpectedError'),
        ),
        is_authenticated: true,
      });
    },
    [
      headlessSessionId,
      trackEvent,
      selectedPaymentMethod?.id,
      regionIsoCode,
      selectedToken?.chainId,
      selectedToken?.assetId,
      selectedToken?.symbol,
      fiatCurrency,
    ],
  );

  const checkUserLimits = useCallback(
    async (quote: TransakBuyQuote, kycType: string) => {
      try {
        const userLimits = await getUserLimits(
          fiatCurrency,
          selectedPaymentMethod?.id || '',
          kycType,
        );

        if (!userLimits?.remaining) {
          return;
        }

        const { remaining } = userLimits;
        const dailyLimit = remaining['1'];
        const monthlyLimit = remaining['30'];
        const yearlyLimit = remaining['365'];

        if (
          dailyLimit === undefined ||
          monthlyLimit === undefined ||
          yearlyLimit === undefined
        ) {
          return;
        }

        const depositAmount = quote.fiatAmount;

        if (depositAmount > dailyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'daily',
              remaining: `${dailyLimit} ${fiatCurrency}`,
            }),
            {
              period: 'daily',
              remaining: dailyLimit,
              currency: fiatCurrency,
            },
          );
        }

        if (depositAmount > monthlyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'monthly',
              remaining: `${monthlyLimit} ${fiatCurrency}`,
            }),
            {
              period: 'monthly',
              remaining: monthlyLimit,
              currency: fiatCurrency,
            },
          );
        }

        if (depositAmount > yearlyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'yearly',
              remaining: `${yearlyLimit} ${fiatCurrency}`,
            }),
            {
              period: 'yearly',
              remaining: yearlyLimit,
              currency: fiatCurrency,
            },
          );
        }
      } catch (error) {
        if (error instanceof LimitExceededError) {
          // Surfaced to the Headless Host as recoverable data, not a terminal
          // failure - intentionally no RAMPS_ORDER_FAILED here.
          throw error;
        }
        if (headlessSessionId) {
          // Infra failure during the limits check: emit the HEADLESS failure
          // event (TRAM-3623 §7) before failSession closes the session.
          emitHeadlessOrderFailed(error, quote);
          failSession(headlessSessionId, error);
          throw error;
        }
        Logger.error(error as Error, 'Failed to check user limits');
      }
    },
    [
      getUserLimits,
      fiatCurrency,
      selectedPaymentMethod?.id,
      headlessSessionId,
      emitHeadlessOrderFailed,
    ],
  );

  const navigateToVerifyIdentityCallback = useCallback(
    ({ quote, amount }: { quote: TransakBuyQuote; amount?: number }) => {
      const baseEntry = buildBaseRouteEntry({ amount });
      resetWithRoutes(navigation, {
        index: 1,
        routes: [
          baseEntry,
          {
            name: Routes.RAMP.VERIFY_IDENTITY,
            params: {
              quote,
              ...(baseRouteParams ?? {}),
            },
          },
        ],
      });
    },
    [navigation, buildBaseRouteEntry, baseRouteParams],
  );

  const navigateToBasicInfoCallback = useCallback(
    ({
      quote,
      previousFormData,
      amount,
    }: {
      quote: TransakBuyQuote;
      previousFormData?: BasicInfoFormData & AddressFormData;
      amount?: number;
    }) => {
      const baseEntry = buildBaseRouteEntry({ amount });
      resetWithRoutes(navigation, {
        index: 1,
        routes: [
          baseEntry,
          {
            name: Routes.RAMP.BASIC_INFO,
            params: {
              quote,
              previousFormData,
              ...(baseRouteParams ?? {}),
            },
          },
        ],
      });
    },
    [navigation, buildBaseRouteEntry, baseRouteParams],
  );

  const navigateToBankDetailsCallback = useCallback(
    ({
      orderId,
      shouldUpdate,
    }: {
      orderId: string;
      shouldUpdate?: boolean;
    }) => {
      resetWithRoutes(navigation, {
        index: 0,
        routes: [
          {
            name: Routes.RAMP.BANK_DETAILS,
            params: { orderId, shouldUpdate },
          },
        ],
      });
    },
    [navigation],
  );

  const navigateToOrderProcessingCallback = useCallback(
    ({ orderId }: { orderId: string }) => {
      // Headless mode: fire `onOrderCreated`, close the session, and pop
      // out of the ramp stack so the caller regains foreground. The
      // consumer drives post-order UI themselves — no RAMPS_ORDER_DETAILS.
      const session = getSession(headlessSessionId);
      if (headlessSessionId && session) {
        try {
          session.callbacks.onOrderCreated(orderId);
        } catch (callbackError) {
          Logger.error(
            callbackError as Error,
            'useTransakRouting: onOrderCreated callback threw',
          );
        }
        closeSession(headlessSessionId, { reason: 'completed' });
        dismissActiveHeadlessFlow();
        return;
      }
      resetWithRoutes(navigation, {
        index: 0,
        routes: [
          {
            name: Routes.RAMP.RAMPS_ORDER_DETAILS,
            params: { orderId, showCloseButton: true },
          },
        ],
      });
    },
    [navigation, headlessSessionId, dismissActiveHeadlessFlow],
  );

  const navigateToAdditionalVerificationCallback = useCallback(
    ({
      quote,
      kycUrl,
      workFlowRunId,
      amount,
    }: {
      quote: TransakBuyQuote;
      kycUrl: string;
      workFlowRunId: string;
      amount?: number;
    }) => {
      resetWithRoutes(navigation, {
        index: 1,
        routes: [
          buildBaseRouteEntry({ amount }),
          {
            name: Routes.RAMP.ADDITIONAL_VERIFICATION,
            params: { quote, kycUrl, workFlowRunId, amount },
          },
        ],
      });
    },
    [navigation, buildBaseRouteEntry],
  );

  const handleNavigationStateChange = useCallback(
    async ({ url }: { url: string }) => {
      if (!url.startsWith(REDIRECTION_URL)) return;

      let orderId: string | null = null;
      try {
        const urlObj = new URL(url);
        orderId = urlObj.searchParams.get('orderId');
      } catch (e) {
        Logger.error(
          e as Error,
          'useTransakRouting: Error parsing redirect URL',
        );
        return;
      }

      if (!orderId) {
        if (headlessSessionId) {
          closeSession(headlessSessionId, { reason: 'user_dismissed' });
          dismissActiveHeadlessFlow();
        }
        return;
      }
      if (processingOrderIdRef.current === orderId) {
        return;
      }
      processingOrderIdRef.current = orderId;

      const session = getSession(headlessSessionId);
      if (headlessSessionId && session) {
        // Headless mode: fetch the order, hand the orderId to the
        // consumer, close the session, and unwind out of the ramp stack
        // so the caller regains foreground. Skip RAMPS_ORDER_DETAILS —
        // the consumer drives its own UI.
        try {
          const depositOrder = await getOrder(orderId, walletAddress || '');

          if (!depositOrder) {
            throw new Error('Missing order');
          }

          const providerCode = String(
            depositOrder.provider ?? getFallbackNativeProviderCode(),
          );
          const rampsOrder = await refreshOrder(
            providerCode,
            depositOrder.providerOrderId,
            walletAddress || depositOrder.walletAddress,
          );

          addOrder({
            ...rampsOrder,
            paymentDetails: depositOrder.paymentDetails,
          });

          // Snapshot the headless context BEFORE closeSession tears it down
          // (TRAM-3623 §4) so the terminal RAMPS_TRANSACTION_CONFIRMED carries
          // ramp_type HEADLESS + the seeded ramp_surface.
          const confirmSession = getSession(headlessSessionId);
          const wasHeadless = Boolean(confirmSession);
          const rampSurface = confirmSession?.params?.rampSurface;
          // Carry the headless context (surface + region) to the controller-side
          // terminal-failed subscriber (TRAM-3623 §1/§5). GUARD: this write MUST
          // stay inside the headless gate (`if (wasHeadless)`); this hook also
          // serves non-headless UB2-native, and an unconditional write at the
          // `addOrder(...)` above would make those orders wrongly emit a HEADLESS
          // RAMPS_TRANSACTION_FAILED. Keyed by providerOrderId (the same id the
          // subscriber receives), normalized via extractOrderCode on both sides.
          if (wasHeadless) {
            setHeadlessOrderContext(rampsOrder.providerOrderId, {
              rampSurface,
              region: regionIsoCode,
            });
          }

          try {
            session.callbacks.onOrderCreated(rampsOrder.providerOrderId);
          } catch (callbackError) {
            Logger.error(
              callbackError as Error,
              'useTransakRouting: onOrderCreated callback threw',
            );
          }
          closeSession(headlessSessionId, { reason: 'completed' });
          // @ts-expect-error `pop` exists on the parent stack navigator at
          // runtime but is not surfaced on the generic `NavigationProp`
          // type returned by `getParent()`.
          navigation.getParent()?.pop();

          // TRAM-3691: a widget payment that came back terminal-failed must NOT
          // report as confirmed/placed. Emit the terminal failure instead — the
          // order is terminal so polling never observes it, and the headless
          // context set above tags it HEADLESS.
          if (
            rampsOrder.status === RampsOrderStatus.Failed ||
            rampsOrder.status === RampsOrderStatus.IdExpired
          ) {
            emitTerminalOrderAnalyticsFromCallback(rampsOrder);
          } else {
            trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
              ramp_type: wasHeadless ? 'HEADLESS' : 'DEPOSIT',
              ramp_surface: rampSurface,
              provider_order_id: rampsOrder.providerOrderId,
              amount_source: Number(rampsOrder.fiatAmount),
              amount_destination: Number(rampsOrder.cryptoAmount),
              exchange_rate: Number(rampsOrder.exchangeRate),
              gas_fee: rampsOrder.networkFees
                ? Number(rampsOrder.networkFees)
                : 0,
              processing_fee: rampsOrder.partnerFees
                ? Number(rampsOrder.partnerFees)
                : 0,
              total_fee: Number(rampsOrder.totalFeesFiat),
              payment_method_id: rampsOrder.paymentMethod?.id || '',
              country: regionIsoCode,
              region: regionIsoCode,
              chain_id: rampsOrder.network?.chainId || '',
              currency_destination: rampsOrder.cryptoCurrency?.assetId || '',
              currency_destination_symbol:
                rampsOrder.cryptoCurrency?.symbol || '',
              currency_destination_network: rampsOrder.network?.name || '',
              currency_source: rampsOrder.fiatCurrency?.symbol || '',
            });
          }
        } catch (error) {
          processingOrderIdRef.current = null;
          Logger.error(error as Error, {
            message:
              'useTransakRouting: Failed to process order after checkout',
          });
          // Emit the HEADLESS failure event BEFORE failSession tears the
          // session down (TRAM-3623 §7) so the surface snapshot is available.
          // orderId (from the callback URL) is the provider order id (TRAM-3696).
          emitHeadlessOrderFailed(error, undefined, orderId);
          if (failSession(headlessSessionId, error)) {
            // @ts-expect-error `pop` exists on the parent stack navigator at
            // runtime but is not surfaced on the generic `NavigationProp`
            // type returned by `getParent()`.
            navigation.getParent()?.pop();
          }
        }
        return;
      }

      // Same pattern as unified Buy WebView Checkout: leave the webview
      // immediately; OrderDetails resolves the order via callback params.
      if (!selectedProvider?.id) {
        processingOrderIdRef.current = null;
        Logger.error(
          new Error('Missing selected provider'),
          'useTransakRouting: cannot open OrderDetails without provider',
        );
        return;
      }

      const cryptoSymbol = selectedToken?.symbol;
      resetWithRoutes(navigation, {
        index: 0,
        routes: [
          {
            name: Routes.RAMP.RAMPS_ORDER_DETAILS,
            params: {
              callbackUrl: url,
              providerCode: selectedProvider.id,
              walletAddress: walletAddress || '',
              showCloseButton: true,
              ...(cryptoSymbol ? { cryptocurrency: cryptoSymbol } : {}),
            },
          },
        ],
      });
    },
    [
      navigation,
      walletAddress,
      headlessSessionId,
      getOrder,
      addOrder,
      refreshOrder,
      regionIsoCode,
      trackEvent,
      selectedToken,
      selectedProvider,
      dismissActiveHeadlessFlow,
      emitHeadlessOrderFailed,
    ],
  );

  const navigateToWebviewModalCallback = useCallback(
    ({ paymentUrl, amount }: { paymentUrl: string; amount?: number }) => {
      const [routeName, routeParams] = createCheckoutNavDetails({
        url: paymentUrl,
        providerName: 'Transak',
        onNavigationStateChange: handleNavigationStateChange,
        headlessSessionId,
      });
      const baseEntry = buildBaseRouteEntry({ amount });
      resetWithRoutes(navigation, {
        index: 1,
        routes: [baseEntry, { name: routeName, params: routeParams }],
      });
    },
    [
      navigation,
      handleNavigationStateChange,
      buildBaseRouteEntry,
      headlessSessionId,
    ],
  );

  const navigateToKycProcessingCallback = useCallback(
    ({ amount }: { amount?: number }) => {
      const baseEntry = buildBaseRouteEntry({ amount });
      resetWithRoutes(navigation, {
        index: 1,
        routes: [
          baseEntry,
          {
            name: Routes.RAMP.KYC_PROCESSING,
            // Thread the headless session id so KycProcessing (no params of its
            // own) can flip its KYC analytics to `ramp_type: 'HEADLESS'` (TRAM-3623).
            params: headlessSessionId ? { headlessSessionId } : undefined,
          },
        ],
      });
    },
    [navigation, buildBaseRouteEntry, headlessSessionId],
  );

  const navigateToKycWebviewCallback = useCallback(
    ({
      quote,
      kycUrl,
      workFlowRunId,
      amount,
    }: {
      quote: TransakBuyQuote;
      kycUrl: string;
      workFlowRunId: string;
      amount?: number;
    }) => {
      const [routeName, routeParams] = createKycWebviewNavDetails({
        url: kycUrl,
        providerName: 'Transak',
        workFlowRunId,
        quote,
        amount,
      });
      resetWithRoutes(navigation, {
        index: 2,
        routes: [
          buildBaseRouteEntry({ amount }),
          {
            name: Routes.RAMP.KYC_PROCESSING,
            // Thread the headless session id (TRAM-3623) - see the reset above.
            params: headlessSessionId ? { headlessSessionId } : undefined,
          },
          { name: routeName, params: routeParams },
        ],
      });
    },
    [navigation, buildBaseRouteEntry, headlessSessionId],
  );

  const routeAfterAuthentication = useCallback(
    async (quote: TransakBuyQuote, amount?: number, depth = 0) => {
      try {
        const userDetails = await getUserDetails();
        const previousFormData = {
          firstName: userDetails?.firstName || '',
          lastName: userDetails?.lastName || '',
          mobileNumber: userDetails?.mobileNumber || '',
          dob: userDetails?.dob || '',
          addressLine1: userDetails?.address?.addressLine1 || '',
          addressLine2: userDetails?.address?.addressLine2 || '',
          city: userDetails?.address?.city || '',
          state: userDetails?.address?.state || '',
          postCode: userDetails?.address?.postCode || '',
          countryCode: userDetails?.address?.countryCode || '',
        };
        const requirements = await getKycRequirement(quote.quoteId);

        if (!requirements) {
          throw new Error('Missing KYC requirements');
        }

        switch (requirements.status) {
          case 'APPROVED': {
            try {
              if (!userDetails) {
                throw new Error('Missing user details');
              }

              await checkUserLimits(quote, requirements.kycType);

              if (selectedPaymentMethod?.isManualBankTransfer) {
                const depositOrder = await transakCreateOrder(
                  quote.quoteId,
                  walletAddress || '',
                  selectedPaymentMethod.id,
                );
                if (!depositOrder) {
                  throw new Error('Missing order');
                }

                const providerCode = String(
                  depositOrder.provider ?? getFallbackNativeProviderCode(),
                );
                const rampsOrder = await refreshOrder(
                  providerCode,
                  depositOrder.providerOrderId,
                  walletAddress || depositOrder.walletAddress,
                );

                addOrder({
                  ...rampsOrder,
                  paymentDetails: depositOrder.paymentDetails,
                });

                // Manual-bank-transfer headless branch (TRAM-3623 §4): snapshot
                // the surface before navigateToOrderProcessingCallback closes
                // the session, then emit the confirmed event.
                const manualBankSession = getSession(headlessSessionId);
                if (manualBankSession) {
                  const rampSurface = manualBankSession.params?.rampSurface;
                  // Carry the headless context to the terminal-failed
                  // subscriber (TRAM-3623 §1/§5). GUARD: inside the
                  // `if (manualBankSession)` headless gate only - never at the
                  // unconditional `addOrder(...)` above - so non-headless
                  // UB2-native manual-bank orders never get an entry.
                  setHeadlessOrderContext(rampsOrder.providerOrderId, {
                    rampSurface,
                    region: regionIsoCode,
                  });
                  navigateToOrderProcessingCallback({
                    orderId: rampsOrder.providerOrderId,
                  });
                  trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
                    ramp_type: 'HEADLESS',
                    ramp_surface: rampSurface,
                    provider_order_id: rampsOrder.providerOrderId,
                    amount_source: Number(rampsOrder.fiatAmount),
                    amount_destination: Number(rampsOrder.cryptoAmount),
                    exchange_rate: Number(rampsOrder.exchangeRate),
                    gas_fee: rampsOrder.networkFees
                      ? Number(rampsOrder.networkFees)
                      : 0,
                    processing_fee: rampsOrder.partnerFees
                      ? Number(rampsOrder.partnerFees)
                      : 0,
                    total_fee: Number(rampsOrder.totalFeesFiat),
                    payment_method_id: rampsOrder.paymentMethod?.id || '',
                    country: regionIsoCode,
                    region: regionIsoCode,
                    chain_id: rampsOrder.network?.chainId || '',
                    currency_destination:
                      rampsOrder.cryptoCurrency?.assetId || '',
                    currency_destination_symbol:
                      rampsOrder.cryptoCurrency?.symbol || '',
                    currency_destination_network:
                      rampsOrder.network?.name || '',
                    currency_source: rampsOrder.fiatCurrency?.symbol || '',
                  });
                  return true;
                }

                showV2OrderToast({
                  orderId: rampsOrder.providerOrderId,
                  cryptocurrency: rampsOrder.cryptoCurrency?.symbol ?? '',
                  cryptoAmount: rampsOrder.cryptoAmount,
                  status: rampsOrder.status,
                });

                navigateToBankDetailsCallback({
                  orderId: rampsOrder.providerOrderId,
                  shouldUpdate: false,
                });
              } else {
                const ottResponse = await requestOtt();

                if (!ottResponse) {
                  throw new Error('Failed to get OTT token');
                }

                const paymentUrl = generatePaymentWidgetUrl(
                  ottResponse.ott,
                  quote,
                  walletAddress || '',
                  generateThemeParameters(themeAppearance, colors),
                );

                if (!paymentUrl) {
                  throw new Error('Failed to generate payment URL');
                }

                navigateToWebviewModalCallback({
                  paymentUrl,
                  amount,
                });
              }
              return true;
            } catch (error) {
              if (error instanceof LimitExceededError) {
                throw error;
              }
              throw new Error(
                parseUserFacingError(
                  error,
                  strings('deposit.buildQuote.unexpectedError'),
                ),
              );
            }
          }

          case 'NOT_SUBMITTED': {
            // Snapshot the headless session BEFORE navigating so KYC_STARTED
            // carries `ramp_type: 'HEADLESS'` + the seeded `ramp_surface`
            // (TRAM-3623); the regular flow keeps `'DEPOSIT'`.
            const kycStartedSession = getSession(headlessSessionId);
            trackEvent('RAMPS_KYC_STARTED', {
              ramp_type: kycStartedSession ? 'HEADLESS' : 'DEPOSIT',
              ramp_surface: kycStartedSession?.params?.rampSurface,
              kyc_type: requirements.kycType || '',
              region: regionIsoCode,
            });

            navigateToBasicInfoCallback({ quote, previousFormData, amount });
            return;
          }

          case 'ADDITIONAL_FORMS_REQUIRED': {
            const additionalRequirements = await getAdditionalRequirements(
              quote.quoteId,
            );
            const formsRequired = additionalRequirements?.formsRequired || [];

            const purposeOfUsageForm = formsRequired.find(
              (f) => f.type === 'PURPOSE_OF_USAGE',
            );

            if (purposeOfUsageForm) {
              if (depth < 5) {
                await submitPurposeOfUsageForm([
                  'Buying/selling crypto for investments',
                ]);
                await routeAfterAuthentication(quote, amount, depth + 1);
              } else {
                Logger.error(
                  new Error(`Submit of purpose depth exceeded: ${depth}`),
                );
              }
              return;
            }

            const idProofForm = formsRequired.find((f) => f.type === 'IDPROOF');

            if (idProofForm) {
              const { metadata } = idProofForm;
              if (!metadata) {
                throw new Error('Missing ID proof metadata');
              }

              // Same headless snapshot as the NOT_SUBMITTED branch above
              // (TRAM-3623): HEADLESS + ramp_surface on the headless path.
              const idProofKycSession = getSession(headlessSessionId);
              trackEvent('RAMPS_KYC_STARTED', {
                ramp_type: idProofKycSession ? 'HEADLESS' : 'DEPOSIT',
                ramp_surface: idProofKycSession?.params?.rampSurface,
                kyc_type: 'STANDARD',
                region: regionIsoCode,
              });

              navigateToAdditionalVerificationCallback({
                quote,
                kycUrl: metadata.kycUrl,
                workFlowRunId: metadata.workFlowRunId,
                amount,
              });
              return;
            }

            navigateToKycProcessingCallback({ amount });
            return;
          }

          case 'SUBMITTED': {
            navigateToKycProcessingCallback({ amount });
            return;
          }

          default:
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
        }
      } catch (error) {
        if (isHttpUnauthorized(error)) {
          await logoutFromProvider(false);
          const hid = baseRouteParams?.headlessSessionId;
          if (typeof hid === 'string' && hid.length > 0) {
            // Match BasicInfo logout: OtpCode requires amount, currency, and
            // assetId in params to re-fetch the Transak quote after re-auth.
            // Without them it navigates to HEADLESS_HOST while the session is
            // already `continued`, so the Host effect never re-runs (stuck loader).
            const resolvedAmount =
              amount != null
                ? String(amount)
                : quote.fiatAmount != null
                  ? String(quote.fiatAmount)
                  : undefined;
            navigateWithDetails(
              navigation,
              createV2EnterEmailNavDetails({
                headlessSessionId: hid,
                amount: resolvedAmount,
                currency: quote.fiatCurrency || fiatCurrency || undefined,
                assetId: selectedToken?.assetId,
              }),
            );
          } else {
            navigation.navigate(Routes.RAMP.ENTER_EMAIL);
          }
          return;
        }
        throw error;
      }
    },
    [
      navigation,
      baseRouteParams,
      fiatCurrency,
      selectedToken?.assetId,
      getKycRequirement,
      getAdditionalRequirements,
      getUserDetails,
      regionIsoCode,
      selectedPaymentMethod?.isManualBankTransfer,
      selectedPaymentMethod?.id,
      addOrder,
      refreshOrder,
      navigateToBankDetailsCallback,
      navigateToWebviewModalCallback,
      navigateToKycProcessingCallback,
      navigateToOrderProcessingCallback,
      headlessSessionId,
      submitPurposeOfUsageForm,
      logoutFromProvider,
      navigateToBasicInfoCallback,
      trackEvent,
      navigateToAdditionalVerificationCallback,
      transakCreateOrder,
      requestOtt,
      generatePaymentWidgetUrl,
      checkUserLimits,
      walletAddress,
      themeAppearance,
      colors,
    ],
  );

  return {
    routeAfterAuthentication,
    navigateToKycWebview: navigateToKycWebviewCallback,
    navigateToVerifyIdentity: navigateToVerifyIdentityCallback,
  };
};
