import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Animated, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import {
  buildQuoteWithRedirectUrl,
  getAggregatorRedirectUrl,
  getCheckoutContext,
} from '../../utils/buildQuoteWithRedirectUrl';
import { extractOrderCode } from '../../utils/extractOrderCode';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
import {
  createBuildQuoteRoute,
  createRampsOrderDetailsRoute,
} from '../../utils/rampsNavigation';
import { reportRampsError } from '../../utils/reportRampsError';
import Keypad, { type KeypadChangeData, Keys } from '../../../../Base/Keypad';
import PaymentMethodPill from '../../components/PaymentMethodPill';
import QuickAmounts from '../../components/QuickAmounts';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { useFormatters } from '../../../../hooks/useFormatters';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import {
  type RampsOrder,
  RampsOrderStatus,
  normalizeProviderCode,
} from '@metamask/ramps-controller';
import { useRampsController } from '../../hooks/useRampsController';
import { useRampsOrders } from '../../hooks/useRampsOrders';
import { useRampsQuotes } from '../../hooks/useRampsQuotes';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useBlinkingCursor } from '../../hooks/useBlinkingCursor';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { createPaymentSelectionModalNavigationDetails } from '../Modals/PaymentSelectionModal';
import { createCheckoutNavDetails } from '../Checkout';
import {
  isNativeProvider,
  isCustomAction,
  getQuoteProviderName,
  getQuoteBuyUserAgent,
} from '../../types';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import { createTokenNotAvailableModalNavigationDetails } from '../Modals/TokenNotAvailableModal';
import { useParams } from '../../../../../util/navigation/navUtils';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTransakController } from '../../hooks/useTransakController';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import { createV2VerifyIdentityNavDetails } from '../NativeFlow/VerifyIdentity';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useSelector } from 'react-redux';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../../reducers/fiatOrders';
import Device from '../../../../../util/device';
import TruncatedError from '../../components/TruncatedError';
import { PROVIDER_LINKS } from '../../Aggregator/types';
const BAILED_ORDER_STATUSES = new Set<RampsOrderStatus>([
  RampsOrderStatus.Precreated,
  RampsOrderStatus.IdExpired,
  RampsOrderStatus.Unknown,
]);

function isBailedOrderStatus(status: RampsOrderStatus | undefined): boolean {
  return status != null && BAILED_ORDER_STATUSES.has(status);
}

export interface BuildQuoteParams {
  assetId?: string;
  nativeFlowError?: string;
}

/**
 * Creates navigation details for the BuildQuote screen (RampAmountInput).
 * This screen is nested inside TokenListRoutes, so navigation must go through
 * the parent route Routes.RAMP.TOKEN_SELECTION.
 */
export const createBuildQuoteNavDetails = (
  params?: BuildQuoteParams,
): readonly [
  string,
  {
    screen: string;
    params: {
      screen: string;
      params?: BuildQuoteParams;
    };
  },
] =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION,
      params: {
        screen: Routes.RAMP.AMOUNT_INPUT,
        params,
      },
    },
  ] as const;

const DEFAULT_AMOUNT = 100;

function BuildQuote() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { formatCurrency } = useFormatters();
  const cursorOpacity = useBlinkingCursor();

  const [amount, setAmount] = useState<string>(() => String(DEFAULT_AMOUNT));
  const [amountAsNumber, setAmountAsNumber] = useState<number>(DEFAULT_AMOUNT);
  const [userHasEnteredAmount, setUserHasEnteredAmount] = useState(false);
  const [keyboardIsDirty, setKeyboardIsDirty] = useState(false);
  const [isContinueLoading, setIsContinueLoading] = useState(false);
  const [rampsError, setRampsError] = useState<string | null>(null);
  const params = useParams<BuildQuoteParams>();

  useEffect(() => {
    if (params?.nativeFlowError) {
      setRampsError(params.nativeFlowError);
      navigation.setParams({ nativeFlowError: undefined });
    }
  }, [params?.nativeFlowError, navigation]);

  const {
    userRegion,
    selectedProvider,
    selectedToken,
    getBuyWidgetData,
    addPrecreatedOrder,
    paymentMethodsLoading,
    selectedPaymentMethod,
  } = useRampsController();

  const { addOrder, getOrderFromCallback } = useRampsOrders();

  const { trackEvent, createEventBuilder } = useAnalytics();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const prevSelectedProviderRef = useRef(selectedProvider);

  /*
   * Resets the native flow error if the selected provider changes.
   */
  useEffect(() => {
    if (prevSelectedProviderRef.current !== selectedProvider) {
      prevSelectedProviderRef.current = selectedProvider;
      setRampsError(null);
    }
  }, [selectedProvider]);

  const isTokenUnavailable = useMemo(
    () =>
      !!(
        selectedProvider &&
        params?.assetId &&
        selectedProvider.supportedCryptoCurrencies &&
        !selectedProvider.supportedCryptoCurrencies[params.assetId]
      ),
    [selectedProvider, params?.assetId],
  );

  /*
   * Shows the "token not available modal" if the token is not available for the selected provider.
   */
  const hasShownTokenUnavailableRef = useRef(false);
  useEffect(() => {
    if (isTokenUnavailable && !hasShownTokenUnavailableRef.current) {
      hasShownTokenUnavailableRef.current = true;
      navigation.navigate(
        ...createTokenNotAvailableModalNavigationDetails({
          assetId: params?.assetId ?? '',
        }),
      );
    } else if (!isTokenUnavailable) {
      hasShownTokenUnavailableRef.current = false;
    }
  }, [isTokenUnavailable, params?.assetId, navigation]);

  const {
    checkExistingToken: transakCheckExistingToken,
    getBuyQuote: transakGetBuyQuote,
  } = useTransakController();

  const { routeAfterAuthentication: transakRouteAfterAuth } =
    useTransakRouting();

  const currency = userRegion?.country?.currency || 'USD';
  const { currencyPrefix, currencySuffix } = useMemo(() => {
    const formatted = formatCurrency(1, currency, {
      currencyDisplay: 'narrowSymbol',
    });
    // Match: prefix (non-digit chars), digits/separators, suffix (non-digit chars)
    const match = formatted.match(/^([^\d]*?)[\d.,]+\s*([^\d\s].*)?$/);
    return {
      currencyPrefix: match?.[1] ?? '',
      currencySuffix: match?.[2]?.trim() ?? '',
    };
  }, [currency, formatCurrency]);
  const quickAmounts = userRegion?.country?.quickAmounts ?? [50, 100, 200, 400];

  /*
   * Tracks RAMPS_SCREEN_VIEWED
   * @returns {void}
   */
  const hasTrackedScreenViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedScreenViewRef.current) return;
    if (rampRoutingDecision != null) {
      hasTrackedScreenViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
          .addProperties({
            location: 'Amount Input',
            ramp_type: 'UNIFIED_BUY_2',
            ramp_routing: rampRoutingDecision,
          })
          .build(),
      );
    }
  }, [rampRoutingDecision, trackEvent, createEventBuilder]);

  /*
   * Sets the default amount for the user's region.
   */
  useEffect(() => {
    if (!userHasEnteredAmount && userRegion?.country?.defaultAmount != null) {
      const regionDefault = userRegion.country.defaultAmount;
      setAmount(String(regionDefault));
      setAmountAsNumber(regionDefault);
      setUserHasEnteredAmount(true);
    }
  }, [userRegion?.country?.defaultAmount, userHasEnteredAmount]);

  const getTokenNetworkInfo = useTokenNetworkInfo();

  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const debouncedPollingAmount = useDebouncedValue(amountAsNumber, 500);

  const quoteFetchEnabled = !!(
    walletAddress &&
    selectedPaymentMethod &&
    selectedProvider &&
    selectedToken?.assetId &&
    debouncedPollingAmount > 0
  );

  /*
   * Creates the quote fetch parameters for the useRampsQuotes hook,
   * Fetches only 1 quote for the selected provider and payment method.
   */
  const quoteFetchParams = useMemo(
    () =>
      selectedToken?.assetId &&
      walletAddress &&
      selectedPaymentMethod &&
      selectedProvider
        ? {
            assetId: selectedToken.assetId,
            amount: debouncedPollingAmount,
            walletAddress,
            redirectUrl: getRampCallbackBaseUrl(),
            paymentMethods: [selectedPaymentMethod.id],
            providers: [selectedProvider.id],
            forceRefresh: true,
          }
        : null,
    [
      selectedToken?.assetId,
      debouncedPollingAmount,
      walletAddress,
      selectedPaymentMethod,
      selectedProvider,
    ],
  );

  const {
    data: quotesResponse,
    loading: selectedQuoteLoading,
    error: quoteFetchError,
  } = useRampsQuotes(quoteFetchEnabled ? quoteFetchParams : null);

  /*
   * Tracks RAMPS_QUOTE_ERROR
   */
  const lastTrackedQuoteErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (
      quoteFetchError &&
      quoteFetchError !== lastTrackedQuoteErrorRef.current
    ) {
      lastTrackedQuoteErrorRef.current = quoteFetchError;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_QUOTE_ERROR)
          .addProperties({
            error_message: parseUserFacingError(
              quoteFetchError,
              strings('deposit.buildQuote.quoteFetchError'),
            ),
            amount: amountAsNumber,
            currency_source: currency,
            currency_destination: selectedToken?.assetId,
            payment_method_id: selectedPaymentMethod?.id,
            chain_id: selectedToken?.chainId,
            ramp_type: 'UNIFIED_BUY_2',
            ramp_routing: rampRoutingDecision ?? undefined,
          })
          .build(),
      );
    }
    if (!quoteFetchError) {
      lastTrackedQuoteErrorRef.current = null;
    }
  }, [
    quoteFetchError,
    amountAsNumber,
    currency,
    selectedToken?.assetId,
    selectedToken?.chainId,
    selectedPaymentMethod?.id,
    rampRoutingDecision,
    trackEvent,
    createEventBuilder,
  ]);

  const selectedQuote = useMemo(() => {
    if (!quotesResponse?.success || !selectedProvider || !selectedPaymentMethod)
      return null;
    const [quote] = quotesResponse.success;
    return quote?.provider === selectedProvider.id ? quote : null;
  }, [quotesResponse, selectedProvider, selectedPaymentMethod]);

  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId as CaipChainId);
  }, [selectedToken, getTokenNetworkInfo]);

  const handleSettingsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_SETTINGS_CLICKED)
        .addProperties({
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.navigate(...createSettingsModalNavDetails());
  }, [trackEvent, createEventBuilder, navigation]);

  const handleBackPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
        .addProperties({
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.goBack();
  }, [trackEvent, createEventBuilder, navigation]);

  const updateAmount = useCallback(
    (valueOrNumber: string | number, valueAsNumber?: number) => {
      if (typeof valueOrNumber === 'string') {
        setAmount(valueOrNumber === '' ? '0' : valueOrNumber);
        setAmountAsNumber(
          valueAsNumber != null
            ? valueAsNumber
            : parseFloat(valueOrNumber) || 0,
        );
      } else {
        setAmount(String(valueOrNumber));
        setAmountAsNumber(valueOrNumber);
      }
      setKeyboardIsDirty(true);
      setUserHasEnteredAmount(true);
      setRampsError(null);
    },
    [],
  );

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber, pressedKey }: KeypadChangeData) => {
      if (pressedKey === Keys.Back && !keyboardIsDirty) {
        updateAmount(0);
        return;
      }
      updateAmount(value, valueAsNumber ?? 0);
    },
    [keyboardIsDirty, updateAmount],
  );

  const handleQuickAmountPress = useCallback(
    (quickAmount: number) => {
      updateAmount(quickAmount);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_QUICK_AMOUNT_CLICKED)
          .addProperties({
            amount: quickAmount,
            currency_source: currency,
            location: 'Amount Input',
            ramp_type: 'UNIFIED_BUY_2',
          })
          .build(),
      );
    },
    [currency, trackEvent, createEventBuilder, updateAmount],
  );

  const navigateAfterExternalBrowser = useCallback(
    (
      opts:
        | { returnDestination: 'buildQuote' }
        | {
            returnDestination: 'order';
            orderCode: string;
            providerCode: string;
            walletAddress?: string;
          },
    ) => {
      if (opts.returnDestination === 'order') {
        navigation.reset({
          index: 0,
          routes: [
            createRampsOrderDetailsRoute({
              orderId: opts.orderCode,
              showCloseButton: true,
            }),
          ],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [createBuildQuoteRoute()],
        });
      }
    },
    [navigation],
  );

  const openExternalBrowserAndNavigate = useCallback(
    async (opts: {
      buyWidgetUrl: string;
      deeplinkRedirectUrl: string;
      effectiveOrderId: string | null;
      effectiveWallet: string;
      providerCode: string;
      network: string;
      addPrecreatedOrder: (o: {
        orderId: string;
        providerCode: string;
        walletAddress: string;
        chainId?: string;
      }) => void;
      getOrderFromCallback: (
        providerCode: string,
        callbackUrl: string,
        wallet: string,
      ) => Promise<RampsOrder>;
      addOrder: (order: RampsOrder) => void;
      navigateAfterBrowser: (
        n:
          | { returnDestination: 'buildQuote' }
          | {
              returnDestination: 'order';
              orderCode: string;
              providerCode: string;
              walletAddress?: string;
            },
      ) => void;
    }) => {
      const {
        buyWidgetUrl,
        deeplinkRedirectUrl,
        effectiveOrderId,
        effectiveWallet,
        providerCode,
        network,
        addPrecreatedOrder: addPrecreated,
        getOrderFromCallback: getOrder,
        addOrder: addOrderFn,
        navigateAfterBrowser: navigateAfter,
      } = opts;

      if (effectiveOrderId && effectiveWallet) {
        addPrecreated({
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
        await Linking.openURL(buyWidgetUrl);
        navigateAfter({ returnDestination: 'buildQuote' });
        return;
      }

      try {
        const result = await InAppBrowser.openAuth(
          buyWidgetUrl,
          deeplinkRedirectUrl,
        );

        if (result.type !== 'success' || !result.url) {
          navigateAfter({ returnDestination: 'buildQuote' });
          return;
        }

        try {
          const order = await getOrder(
            providerCode,
            result.url,
            effectiveWallet,
          );

          if (!order || isBailedOrderStatus(order.status)) {
            navigateAfter({ returnDestination: 'buildQuote' });
            return;
          }

          addOrderFn(order);

          const rawOrderId = order.providerOrderId ?? effectiveOrderId;
          if (!rawOrderId) {
            navigateAfter({ returnDestination: 'buildQuote' });
            return;
          }

          const orderCode = extractOrderCode(rawOrderId);
          navigateAfter({
            returnDestination: 'order',
            orderCode,
            providerCode,
            walletAddress: effectiveWallet || undefined,
          });
        } catch {
          navigateAfter({ returnDestination: 'buildQuote' });
        }
      } finally {
        InAppBrowser.closeAuth();
      }
    },
    [],
  );

  const handlePaymentPillPress = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED,
      )
        .addProperties({
          current_payment_method: selectedPaymentMethod?.id,
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.navigate(
      ...createPaymentSelectionModalNavigationDetails({
        amount: debouncedPollingAmount,
      }),
    );
  }, [
    debouncedPollingAmount,
    navigation,
    selectedPaymentMethod?.id,
    trackEvent,
    createEventBuilder,
  ]);

  /**
   * Handles the continue button press for a native provider such as Transak.
   * This function checks if the user has an authenticated account and routes the use appropriately.
   * @returns {Promise<void>}
   */
  const handleNativeProviderContinue = useCallback(async () => {
    setIsContinueLoading(true);
    try {
      const hasToken = await transakCheckExistingToken();

      if (hasToken) {
        const quote = await transakGetBuyQuote(
          currency,
          selectedToken?.assetId || '',
          selectedToken?.chainId || '',
          selectedPaymentMethod?.id || '',
          String(amountAsNumber),
        );
        if (!quote) {
          throw new Error(strings('deposit.buildQuote.unexpectedError'));
        }
        await transakRouteAfterAuth(quote);
      } else {
        navigation.navigate(
          ...createV2VerifyIdentityNavDetails({
            amount: String(amountAsNumber),
            currency,
            assetId: selectedToken?.assetId,
          }),
        );
      }
    } catch (error) {
      setRampsError(
        reportRampsError(
          error,
          { message: 'Failed to route native provider flow' },
          strings('deposit.buildQuote.unexpectedError'),
        ),
      );
    } finally {
      setIsContinueLoading(false);
    }
  }, [
    currency,
    selectedToken?.assetId,
    selectedToken?.chainId,
    selectedPaymentMethod?.id,
    amountAsNumber,
    transakCheckExistingToken,
    transakGetBuyQuote,
    transakRouteAfterAuth,
    navigation,
  ]);

  /**
   * Handles the continue button press for widget providers (custom action e.g. PayPal,
   * or aggregator e.g. Moonpay, Mercuryo). Fetches the widget URL and routes the user
   * to either external browser or in-app Checkout based on the provider configuration.
   * @returns {Promise<void>}
   */
  const handleWidgetProviderContinue = useCallback(async () => {
    if (!selectedQuote) return;
    setIsContinueLoading(true);
    try {
      const providerCode = normalizeProviderCode(selectedQuote.provider);
      const isCustom = isCustomAction(selectedQuote);
      const redirectUrl = isCustom
        ? `metamask://on-ramp/providers/${providerCode}`
        : getAggregatorRedirectUrl(selectedQuote, providerCode);
      const quoteForWidget = buildQuoteWithRedirectUrl(
        selectedQuote,
        redirectUrl,
      );
      const buyWidget = await getBuyWidgetData(quoteForWidget);

      if (!buyWidget?.url) {
        setRampsError(
          reportRampsError(
            new Error('No widget URL available for provider'),
            { provider: selectedQuote.provider },
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
        return;
      }

      const { network, effectiveWallet, effectiveOrderId } = getCheckoutContext(
        selectedToken,
        walletAddress,
        buyWidget.orderId,
      );
      const useExternalBrowser =
        isCustom || buyWidget.browser === 'IN_APP_OS_BROWSER';

      if (useExternalBrowser) {
        const deeplinkRedirectUrl = `metamask://on-ramp/providers/${providerCode}`;
        await openExternalBrowserAndNavigate({
          buyWidgetUrl: buyWidget.url,
          deeplinkRedirectUrl,
          effectiveOrderId,
          effectiveWallet,
          providerCode,
          network,
          addPrecreatedOrder,
          getOrderFromCallback,
          addOrder,
          navigateAfterBrowser: navigateAfterExternalBrowser,
        });
        return;
      }

      navigation.navigate(
        ...createCheckoutNavDetails({
          url: buyWidget.url,
          providerName:
            selectedProvider?.name || getQuoteProviderName(selectedQuote),
          userAgent: getQuoteBuyUserAgent(selectedQuote),
          providerCode,
          providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
          walletAddress: effectiveWallet || undefined,
          network,
          currency,
          cryptocurrency: selectedToken?.symbol || '',
          orderId: buyWidget.orderId?.trim() || undefined,
        }),
      );
    } catch (error) {
      setRampsError(
        reportRampsError(
          error,
          {
            provider: selectedQuote.provider,
            message: 'Failed to fetch widget URL',
          },
          strings('deposit.buildQuote.unexpectedError'),
        ),
      );
    } finally {
      setIsContinueLoading(false);
    }
  }, [
    selectedQuote,
    selectedProvider,
    selectedToken,
    walletAddress,
    currency,
    navigation,
    getBuyWidgetData,
    addPrecreatedOrder,
    getOrderFromCallback,
    addOrder,
    navigateAfterExternalBrowser,
    openExternalBrowserAndNavigate,
  ]);

  const handleContinuePress = useCallback(async () => {
    if (!selectedQuote || !selectedProvider) return;
    setRampsError(null);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CONTINUE_BUTTON_CLICKED)
        .addProperties({
          ramp_routing:
            rampRoutingDecision ?? UnifiedRampRoutingType.AGGREGATOR,
          ramp_type: 'UNIFIED_BUY_2',
          amount_source: amountAsNumber,
          payment_method_id: selectedPaymentMethod?.id ?? '',
          provider_onramp: selectedProvider?.name,
          region: userRegion?.regionCode ?? '',
          chain_id: selectedToken?.chainId ?? '',
          currency_destination: selectedToken?.assetId ?? '',
          currency_destination_symbol: selectedToken?.symbol,
          currency_source: currency,
        })
        .build(),
    );

    if (isNativeProvider(selectedQuote)) {
      await handleNativeProviderContinue();
    } else {
      await handleWidgetProviderContinue();
    }
  }, [
    selectedQuote,
    selectedProvider,
    selectedToken,
    amountAsNumber,
    currency,
    selectedPaymentMethod?.id,
    rampRoutingDecision,
    userRegion?.regionCode,
    trackEvent,
    createEventBuilder,
    handleNativeProviderContinue,
    handleWidgetProviderContinue,
  ]);

  const hasAmount = amountAsNumber > 0;

  const canContinue =
    hasAmount && !selectedQuoteLoading && selectedQuote !== null;

  const hasNoQuotes =
    hasAmount &&
    !selectedQuoteLoading &&
    !quoteFetchError &&
    quotesResponse !== null &&
    selectedQuote === null;

  const noQuotesErrorMessage = selectedProvider
    ? strings('fiat_on_ramp.no_quotes_error', {
        provider: selectedProvider.name,
      })
    : strings('fiat_on_ramp.no_quotes_available');

  return (
    <>
      <HeaderCompactStandard
        title={
          selectedToken?.symbol
            ? strings('fiat_on_ramp.buy', { ticker: selectedToken.symbol })
            : undefined
        }
        subtitle={
          networkInfo?.networkName
            ? strings('fiat_on_ramp.on_network', {
                networkName: networkInfo.networkName,
              })
            : undefined
        }
        onBack={handleBackPress}
        backButtonProps={{ testID: 'build-quote-back-button' }}
        endButtonIconProps={[
          {
            iconName: IconName.Setting,
            onPress: handleSettingsPress,
            testID: 'build-quote-settings-button',
          },
        ]}
        includesTopInset
      />
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content style={styles.content}>
            <View style={styles.centerGroup}>
              <View style={styles.amountContainer}>
                <View style={styles.amountRow}>
                  <Text
                    testID={BuildQuoteSelectors.AMOUNT_INPUT}
                    variant={TextVariant.HeadingLG}
                    color={
                      rampsError || hasNoQuotes || quoteFetchError
                        ? TextColor.Error
                        : undefined
                    }
                    style={styles.mainAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {currencyPrefix}
                    {amount}
                  </Text>
                  <Animated.View
                    style={[styles.cursor, { opacity: cursorOpacity }]}
                  />
                  {currencySuffix ? (
                    <Text
                      variant={TextVariant.HeadingLG}
                      color={
                        rampsError || hasNoQuotes || quoteFetchError
                          ? TextColor.Error
                          : undefined
                      }
                      style={styles.mainAmount}
                    >
                      {currencySuffix}
                    </Text>
                  ) : null}
                </View>
                <PaymentMethodPill
                  label={
                    selectedPaymentMethod?.name ||
                    strings('fiat_on_ramp.select_payment_method')
                  }
                  isLoading={paymentMethodsLoading}
                  onPress={handlePaymentPillPress}
                />
              </View>
            </View>

            {quoteFetchError && (
              <BannerAlert
                severity={BannerAlertSeverity.Error}
                description={parseUserFacingError(
                  quoteFetchError,
                  strings('deposit.buildQuote.quoteFetchError'),
                )}
              />
            )}

            <View style={styles.actionSection}>
              {hasAmount ? (
                <>
                  {rampsError ? (
                    <TruncatedError
                      error={rampsError}
                      providerName={selectedProvider?.name}
                      providerSupportUrl={
                        selectedProvider?.links?.find(
                          (link) => link.name === PROVIDER_LINKS.SUPPORT,
                        )?.url
                      }
                    />
                  ) : hasNoQuotes ? (
                    <TruncatedError
                      error={strings('fiat_on_ramp.encountered_error')}
                      errorDetails={noQuotesErrorMessage}
                      showChangeProvider
                      amount={amountAsNumber}
                    />
                  ) : (
                    selectedProvider && (
                      <Text
                        variant={TextVariant.BodySM}
                        style={styles.poweredByText}
                      >
                        {strings('fiat_on_ramp.powered_by_provider', {
                          provider: selectedProvider.name,
                        })}
                      </Text>
                    )
                  )}
                  <Button
                    variant={ButtonVariant.Primary}
                    size={ButtonSize.Lg}
                    onPress={handleContinuePress}
                    isFullWidth
                    isDisabled={!canContinue}
                    isLoading={selectedQuoteLoading || isContinueLoading}
                    testID={BuildQuoteSelectors.CONTINUE_BUTTON}
                  >
                    {strings('fiat_on_ramp.continue')}
                  </Button>
                </>
              ) : (
                quickAmounts.length > 0 && (
                  <QuickAmounts
                    amounts={quickAmounts}
                    currency={currency}
                    onAmountPress={handleQuickAmountPress}
                  />
                )
              )}
            </View>
            <Keypad
              currency={currency}
              value={amount}
              onChange={handleKeypadChange}
            />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    </>
  );
}

export default BuildQuote;
