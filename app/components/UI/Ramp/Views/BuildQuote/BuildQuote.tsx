import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import {
  buildQuoteWithRedirectUrl,
  getAggregatorRedirectUrl,
  getCheckoutContext,
} from '../../utils/buildQuoteWithRedirectUrl';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
import { openExternalBrowserAndNavigate } from '../../utils/openExternalBrowserCheckout';
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
import { normalizeProviderCode } from '@metamask/ramps-controller';
import { useRampsController } from '../../hooks/useRampsController';
import { useRampsOrders } from '../../hooks/useRampsOrders';
import { useRampsQuotes } from '../../hooks/useRampsQuotes';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
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
import TruncatedError from '../../components/TruncatedError';
import { PROVIDER_LINKS } from '../../Aggregator/types';
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

  const [amount, setAmount] = useState<string>(() => String(DEFAULT_AMOUNT));
  const [amountAsNumber, setAmountAsNumber] = useState<number>(DEFAULT_AMOUNT);
  const [userHasEnteredAmount, setUserHasEnteredAmount] = useState(false);
  const [keyboardIsDirty, setKeyboardIsDirty] = useState(false);
  const [isContinueLoading, setIsContinueLoading] = useState(false);
  const [rampsError, setRampsError] = useState<string | null>(null);
  const params = useParams<BuildQuoteParams>();

  /*
   * Sets the native flow error if the native flow error is set.
   */
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

  const updateAmount = useCallback((value: number) => {
    setAmount(String(value));
    setAmountAsNumber(value);
    setKeyboardIsDirty(true);
    setUserHasEnteredAmount(true);
    setRampsError(null);
  }, []);

  const handleKeypadChange = useCallback(
    ({ valueAsNumber, pressedKey }: KeypadChangeData) => {
      if (pressedKey === Keys.Back) {
        updateAmount(!keyboardIsDirty ? 0 : valueAsNumber || 0);
        return;
      }
      updateAmount(valueAsNumber || 0);
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
        | { type: 'buildQuote' }
        | {
            type: 'order';
            orderCode: string;
            providerCode: string;
            walletAddress?: string;
          },
    ) => {
      if (opts.type === 'order') {
        navigation.reset({
          index: 0,
          routes: [
            createRampsOrderDetailsRoute({
              orderId: opts.orderCode,
              showCloseButton: true,
              providerCode: opts.providerCode,
              walletAddress: opts.walletAddress,
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
   * Handles the continue button press for a "custom action" provider such as PayPal.
   * This function fetches the widget URL from the provider and routes the user to the widget.
   * @returns {Promise<void>}
   */
  const handleCustomActionContinue = useCallback(async () => {
    if (!selectedQuote) return;
    setIsContinueLoading(true);
    try {
      const providerCode = normalizeProviderCode(selectedQuote.provider);
      const deeplinkRedirectUrl = `metamask://on-ramp/providers/${providerCode}`;
      const quoteForWidget = buildQuoteWithRedirectUrl(
        selectedQuote,
        deeplinkRedirectUrl,
      );
      const buyWidget = await getBuyWidgetData(quoteForWidget);

      if (!buyWidget?.url) {
        setRampsError(
          reportRampsError(
            new Error('No widget URL available for custom action provider'),
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
    } catch (error) {
      setRampsError(
        reportRampsError(
          error,
          {
            provider: selectedQuote.provider,
            message: 'Failed to fetch widget URL for custom action',
          },
          strings('deposit.buildQuote.unexpectedError'),
        ),
      );
    } finally {
      setIsContinueLoading(false);
    }
  }, [
    selectedQuote,
    selectedToken,
    walletAddress,
    getBuyWidgetData,
    addPrecreatedOrder,
    getOrderFromCallback,
    addOrder,
    navigateAfterExternalBrowser,
  ]);

  /**
   * Handles the continue button press for an aggregator provider such as Moonpay, Mercuryo, etc.
   * This function simply fetches the widget URL from the provider and routes the user to the widget.
   * @returns {Promise<void>}
   */
  const handleAggregatorContinue = useCallback(async () => {
    if (!selectedQuote) return;
    setIsContinueLoading(true);
    try {
      const providerCode = normalizeProviderCode(selectedQuote.provider);
      const redirectUrl = getAggregatorRedirectUrl(selectedQuote, providerCode);
      const quoteForWidget = buildQuoteWithRedirectUrl(
        selectedQuote,
        redirectUrl,
      );

      const buyWidget = await getBuyWidgetData(quoteForWidget);

      if (!buyWidget?.url) {
        setRampsError(
          reportRampsError(
            new Error('No widget URL available for aggregator provider'),
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
      const useExternalBrowser = buyWidget.browser === 'IN_APP_OS_BROWSER';

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
    } else if (isCustomAction(selectedQuote)) {
      await handleCustomActionContinue();
    } else {
      await handleAggregatorContinue();
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
    handleCustomActionContinue,
    handleAggregatorContinue,
  ]);

  const hasAmount = amountAsNumber > 0;

  // No strict quote-vs-context matching: provider handles fresh quote, payment method, etc.
  // Bugbot will catch if a stale/mismatched quote causes issues.
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
                  {formatCurrency(amountAsNumber, currency, {
                    currencyDisplay: 'narrowSymbol',
                  })}
                </Text>
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
