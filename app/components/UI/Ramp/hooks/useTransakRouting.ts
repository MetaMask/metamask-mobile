import { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  normalizeProviderCode,
  type TransakBuyQuote,
} from '@metamask/ramps-controller';
import { REDIRECTION_URL } from '../Deposit/constants';
import { generateThemeParameters } from '../Deposit/utils';
import { BasicInfoFormData } from '../Deposit/Views/BasicInfo/BasicInfo';
import { AddressFormData } from '../Deposit/Views/EnterAddress/EnterAddress';
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
import { selectTokens } from '../../../../selectors/rampsController';
import useRampAccountAddress from './useRampAccountAddress';
import { isHttpUnauthorized } from '../utils/isHttpUnauthorized';
import { parseUserFacingError } from '../utils/parseUserFacingError';
import { redactUrlForAnalytics } from '../utils/redactUrlForAnalytics';
import { useRampsOrders } from './useRampsOrders';
import {
  closeSession,
  failSession,
  getSession,
} from '../headless/sessionRegistry';
import { dismissHeadlessFlow } from '../headless/headlessEntryNavigation';
import { getChainIdFromAssetId } from '../headless';

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
  RampKycProcessing: undefined;
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
  const navigation = useNavigation<StackNavigationProp<RampStackParamList>>();
  const { themeAppearance, colors } = useTheme();
  const trackEvent = useAnalytics();
  const processingOrderIdRef = useRef<string | null>(null);
  // The quoteId of the Transak quote handed to the payment webview. Captured
  // in `routeAfterAuthentication` (the same hook instance that later receives
  // the redirect) so the "Back to app" recovery path can match the active
  // order strictly by quoteId without re-deriving it from the current render
  // (TRAM-3637).
  const quoteIdRef = useRef<string | undefined>(undefined);
  // Guards the no-orderId recovery branch: set true before the first await so
  // repeated "Back to app" taps / a second redirect during recovery are
  // swallowed (only one getActiveOrders call, one terminal callback).
  const dismissRecoveryStartedRef = useRef<boolean>(false);
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
    getActiveOrders,
    getUserLimits,
    requestOtt,
    generatePaymentWidgetUrl,
    submitPurposeOfUsageForm,
  } = useTransakController();

  const { userRegion } = useRampsUserRegion();
  const { selectedPaymentMethod } = useRampsPaymentMethods();

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
          throw error;
        }
        if (headlessSessionId) {
          failSession(headlessSessionId, error);
          throw error;
        }
        Logger.error(error as Error, 'Failed to check user limits');
      }
    },
    [getUserLimits, fiatCurrency, selectedPaymentMethod?.id, headlessSessionId],
  );

  const navigateToVerifyIdentityCallback = useCallback(
    ({ quote, amount }: { quote: TransakBuyQuote; amount?: number }) => {
      const baseEntry = buildBaseRouteEntry({ amount });
      navigation.reset({
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
      navigation.reset({
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
      navigation.reset({
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
      // consumer drives post-order UI themselves - no RAMPS_ORDER_DETAILS.
      const session = getSession(headlessSessionId);
      if (headlessSessionId && session) {
        // Capture the session-registered dismiss BEFORE closeSession clears
        // it. Checkout registers its own valid-scope teardown, which works
        // where the hook-scoped `dismissActiveHeadlessFlow` no-ops once
        // Checkout is the focused route (TRAM-3637).
        const dismiss = session.dismiss ?? dismissActiveHeadlessFlow;
        try {
          session.callbacks.onOrderCreated(orderId);
        } catch (callbackError) {
          Logger.error(
            callbackError as Error,
            'useTransakRouting: onOrderCreated callback threw',
          );
        }
        closeSession(headlessSessionId, { reason: 'completed' });
        dismiss();
        return;
      }
      navigation.reset({
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
      navigation.reset({
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

  const trackOrderConfirmed = useCallback(
    (rampsOrder: Awaited<ReturnType<typeof refreshOrder>>) => {
      trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
        ramp_type: 'DEPOSIT',
        amount_source: Number(rampsOrder.fiatAmount),
        amount_destination: Number(rampsOrder.cryptoAmount),
        exchange_rate: Number(rampsOrder.exchangeRate),
        gas_fee: rampsOrder.networkFees ? Number(rampsOrder.networkFees) : 0,
        processing_fee: rampsOrder.partnerFees
          ? Number(rampsOrder.partnerFees)
          : 0,
        total_fee: Number(rampsOrder.totalFeesFiat),
        payment_method_id: rampsOrder.paymentMethod?.id || '',
        country: regionIsoCode,
        chain_id: rampsOrder.network?.chainId || '',
        currency_destination: rampsOrder.cryptoCurrency?.assetId || '',
        currency_destination_symbol: rampsOrder.cryptoCurrency?.symbol || '',
        currency_destination_network: rampsOrder.network?.name || '',
        currency_source: rampsOrder.fiatCurrency?.symbol || '',
      });
    },
    [trackEvent, regionIsoCode],
  );

  // Shared capture path for a freshly produced Transak order, used by BOTH the
  // redirect-with-orderId path and the "Back to app" recovery path. `addOrder`
  // always runs so Activity/Redux stays correct even if the session was torn
  // down mid-flight (TRAM-3637 Bug 1). For a live headless session it fires
  // `onOrderCreated`, closes the session as `completed`, and tears the flow
  // down via the session-registered dismiss LAST. Non-headless callers keep
  // the toast + RAMPS_ORDER_DETAILS reset unchanged.
  const processCapturedOrder = useCallback(
    async (rawOrderId: string) => {
      // Capture the session and its dismiss BEFORE any await/closeSession so a
      // dismiss tied to Checkout's scope is not lost when closeSession clears
      // it.
      const sessionBefore = getSession(headlessSessionId);
      const dismiss = sessionBefore?.dismiss ?? dismissActiveHeadlessFlow;

      const depositOrder = await getOrder(rawOrderId, walletAddress || '');

      if (!depositOrder) {
        throw new Error('Missing order');
      }

      const providerCode = normalizeProviderCode(
        String(depositOrder.provider ?? 'transak-native'),
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

      const sessionAfter = getSession(headlessSessionId);
      if (sessionAfter) {
        // Live headless session: hand the orderId to the consumer, close the
        // session, track, then dismiss LAST.
        try {
          sessionAfter.callbacks.onOrderCreated(rampsOrder.providerOrderId);
        } catch (callbackError) {
          Logger.error(
            callbackError as Error,
            'useTransakRouting: onOrderCreated callback threw',
          );
        }
        closeSession(headlessSessionId, { reason: 'completed' });
        trackOrderConfirmed(rampsOrder);
        dismiss();
        return;
      }

      if (sessionBefore) {
        // The session was live when we started but was closed during the
        // awaits (e.g. a concurrent dismissal). `addOrder` already ran so
        // Activity is correct; skip onOrderCreated/closeSession to avoid a
        // double-fire, and dismiss LAST.
        dismiss();
        return;
      }

      // Non-headless (or a headlessSessionId whose session is already gone):
      // preserve the existing toast + RAMPS_ORDER_DETAILS reset behavior.
      showV2OrderToast({
        orderId: rampsOrder.providerOrderId,
        cryptocurrency: rampsOrder.cryptoCurrency?.symbol ?? '',
        cryptoAmount: rampsOrder.cryptoAmount,
        status: rampsOrder.status,
      });

      navigateToOrderProcessingCallback({
        orderId: rampsOrder.providerOrderId,
      });

      trackOrderConfirmed(rampsOrder);
    },
    [
      getOrder,
      walletAddress,
      addOrder,
      refreshOrder,
      navigateToOrderProcessingCallback,
      trackOrderConfirmed,
      headlessSessionId,
      dismissActiveHeadlessFlow,
    ],
  );

  // Recovers the order when Transak's "Back to app" redirects with no orderId
  // while the order is still processing (TRAM-3637 Bug 1). Pulls the active
  // orders from Transak, matches STRICTLY on the quoteId handed to the webview,
  // and routes a match through `processCapturedOrder`. Bounded retry covers the
  // window where Transak has not yet listed the just-created order.
  const recoverHeadlessOrderWithoutId = useCallback(async () => {
    if (!headlessSessionId) {
      // Non-headless redirect without an orderId is a no-op, same as before.
      return;
    }
    const session = getSession(headlessSessionId);
    if (!session) {
      return;
    }
    // Set BEFORE any await so repeated "Back to app" taps / a second redirect
    // during recovery are swallowed: only one getActiveOrders sweep and one
    // terminal callback.
    if (dismissRecoveryStartedRef.current) {
      return;
    }
    dismissRecoveryStartedRef.current = true;

    const dismiss = session.dismiss ?? dismissActiveHeadlessFlow;

    try {
      // 3 attempts. The first runs immediately (a just-created order is
      // usually listed already); failed attempts back off ~200ms then ~400ms
      // before retrying to cover Transak's eventual-consistency window.
      const backoffsMs = [200, 400, 800];
      for (let attempt = 0; attempt < backoffsMs.length; attempt += 1) {
        // Bail if the session was torn down between attempts.
        if (!getSession(headlessSessionId)) {
          return;
        }
        const activeOrders = await getActiveOrders();
        const matchedOrder = activeOrders.find(
          (o) => o.quoteId === quoteIdRef.current,
        );
        if (matchedOrder) {
          // Re-check liveness before committing the terminal capture.
          if (!getSession(headlessSessionId)) {
            return;
          }
          await processCapturedOrder(matchedOrder.orderId);
          return;
        }
        if (attempt < backoffsMs.length - 1) {
          await new Promise<void>((resolve) =>
            setTimeout(resolve, backoffsMs[attempt]),
          );
        }
      }
      // No active order matched the quote across retries: treat as a genuine
      // user dismissal and tear the flow down.
      closeSession(headlessSessionId, { reason: 'user_dismissed' });
      dismiss();
    } catch (e) {
      // A 401 here just means the session is no longer authenticated; treat it
      // as a dismissal rather than surfacing an error to the consumer.
      if (!isHttpUnauthorized(e)) {
        Logger.error(e as Error, {
          message:
            'useTransakRouting: Failed to recover order after Back to app',
        });
      }
      closeSession(headlessSessionId, { reason: 'user_dismissed' });
      dismiss();
    }
  }, [
    headlessSessionId,
    dismissActiveHeadlessFlow,
    getActiveOrders,
    processCapturedOrder,
  ]);

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

      // Diagnostic only: never log the raw url (it carries provider tokens).
      Logger.log(
        `useTransakRouting: Transak redirect received (hasOrderId=${Boolean(
          orderId,
        )}, url=${redactUrlForAnalytics(url)})`,
      );

      if (!orderId) {
        await recoverHeadlessOrderWithoutId();
        return;
      }
      if (processingOrderIdRef.current === orderId) {
        return;
      }
      processingOrderIdRef.current = orderId;

      try {
        await processCapturedOrder(orderId);
      } catch (error) {
        processingOrderIdRef.current = null;
        Logger.error(error as Error, {
          message: 'useTransakRouting: Failed to process order after checkout',
        });
        if (failSession(headlessSessionId, error)) {
          dismissActiveHeadlessFlow();
        }
      }
    },
    [
      processCapturedOrder,
      recoverHeadlessOrderWithoutId,
      headlessSessionId,
      dismissActiveHeadlessFlow,
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
      navigation.reset({
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
      navigation.reset({
        index: 1,
        routes: [baseEntry, { name: Routes.RAMP.KYC_PROCESSING }],
      });
    },
    [navigation, buildBaseRouteEntry],
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
      navigation.reset({
        index: 2,
        routes: [
          buildBaseRouteEntry({ amount }),
          {
            name: Routes.RAMP.KYC_PROCESSING,
          },
          { name: routeName, params: routeParams },
        ],
      });
    },
    [navigation, buildBaseRouteEntry],
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

                const providerCode = normalizeProviderCode(
                  String(depositOrder.provider ?? 'transak-native'),
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

                if (getSession(headlessSessionId)) {
                  navigateToOrderProcessingCallback({
                    orderId: rampsOrder.providerOrderId,
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

                // Remember which quote this webview is for so a "Back to app"
                // redirect with no orderId can recover the matching active
                // order strictly by quoteId (TRAM-3637). Same hook instance
                // owns the redirect handler, so this ref is the source of
                // truth - do not re-derive from the current render.
                quoteIdRef.current = quote.quoteId;

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

          case 'NOT_SUBMITTED':
            trackEvent('RAMPS_KYC_STARTED', {
              ramp_type: 'DEPOSIT',
              kyc_type: requirements.kycType || '',
              region: regionIsoCode,
            });

            navigateToBasicInfoCallback({ quote, previousFormData, amount });
            return;

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

              trackEvent('RAMPS_KYC_STARTED', {
                ramp_type: 'DEPOSIT',
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
            navigation.navigate(
              ...createV2EnterEmailNavDetails({
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
      navigateToOrderProcessingCallback,
      headlessSessionId,
      navigateToWebviewModalCallback,
      navigateToKycProcessingCallback,
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
