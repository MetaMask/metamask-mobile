import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
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
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import { getRampsBuildQuoteNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { useFormatters } from '../../../../hooks/useFormatters';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import { normalizeProviderCode } from '@metamask/ramps-controller';
import { useRampsController } from '../../hooks/useRampsController';
import { useRampsQuotes } from '../../hooks/useRampsQuotes';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { createPaymentSelectionModalNavigationDetails } from '../Modals/PaymentSelectionModal';
import { createCheckoutNavDetails } from '../Checkout';
import {
  isNativeProvider,
  getQuoteProviderName,
  getQuoteBuyUserAgent,
} from '../../types';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import Logger from '../../../../../util/Logger';
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
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Device from '../../../../../util/device';

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
  const [isOnBuildQuoteScreen, setIsOnBuildQuoteScreen] =
    useState<boolean>(true);
  const [isContinueLoading, setIsContinueLoading] = useState(false);
  const [nativeFlowError, setNativeFlowError] = useState<string | null>(null);
  const params = useParams<BuildQuoteParams>();

  useEffect(() => {
    if (params?.nativeFlowError) {
      setNativeFlowError(params.nativeFlowError);
      navigation.setParams({ nativeFlowError: undefined });
    }
  }, [params?.nativeFlowError, navigation]);

  useFocusEffect(
    useCallback(() => {
      setIsOnBuildQuoteScreen(true);
      return () => {
        setIsOnBuildQuoteScreen(false);
      };
    }, []),
  );

  const {
    userRegion,
    selectedProvider,
    selectedToken,
    getBuyWidgetData,
    addPrecreatedOrder,
    paymentMethodsLoading,
    selectedPaymentMethod,
  } = useRampsController();

  const { trackEvent, createEventBuilder } = useAnalytics();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const prevSelectedProviderRef = useRef(selectedProvider);
  useEffect(() => {
    if (prevSelectedProviderRef.current !== selectedProvider) {
      prevSelectedProviderRef.current = selectedProvider;
      setNativeFlowError(null);
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
    isOnBuildQuoteScreen &&
    walletAddress &&
    selectedPaymentMethod &&
    selectedProvider &&
    selectedToken?.assetId &&
    debouncedPollingAmount > 0
  );

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
    const { success } = quotesResponse;
    const providerMatches = (q: (typeof success)[0]) =>
      q.provider === selectedProvider.id;
    let result: (typeof success)[0] | null = null;
    if (success.length === 1) {
      result = providerMatches(success[0]) ? success[0] : null;
    } else if (success.length > 1) {
      const match = success.find(
        (q) =>
          providerMatches(q) &&
          q.quote?.paymentMethod === selectedPaymentMethod.id,
      );
      result = match ?? null;
    }
    return result;
  }, [quotesResponse, selectedProvider, selectedPaymentMethod]);

  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId as CaipChainId);
  }, [selectedToken, getTokenNetworkInfo]);

  useEffect(() => {
    navigation.setOptions(
      getRampsBuildQuoteNavbarOptions(navigation, {
        tokenName: selectedToken?.name,
        tokenSymbol: selectedToken?.symbol,
        tokenIconUrl: selectedToken?.iconUrl,
        networkName: networkInfo?.networkName ?? undefined,
        networkImageSource: networkInfo?.networkImageSource,
        onSettingsPress: () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.RAMPS_SETTINGS_CLICKED)
              .addProperties({
                location: 'Amount Input',
                ramp_type: 'UNIFIED_BUY_2',
              })
              .build(),
          );
          navigation.navigate(...createSettingsModalNavDetails());
        },
        onBackPress: () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
              .addProperties({
                location: 'Amount Input',
                ramp_type: 'UNIFIED_BUY_2',
              })
              .build(),
          );
        },
      }),
    );
  }, [navigation, selectedToken, networkInfo, trackEvent, createEventBuilder]);

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber, pressedKey }: KeypadChangeData) => {
      if (pressedKey === Keys.Back) {
        if (!keyboardIsDirty) {
          setAmount('0');
          setAmountAsNumber(0);
        } else {
          setAmount(value || '0');
          setAmountAsNumber(valueAsNumber || 0);
        }
        setKeyboardIsDirty(true);
        setUserHasEnteredAmount(true);
        setNativeFlowError(null);
        return;
      }

      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
      setKeyboardIsDirty(true);
      setUserHasEnteredAmount(true);
      setNativeFlowError(null);
    },
    [keyboardIsDirty],
  );

  const handleQuickAmountPress = useCallback(
    (quickAmount: number) => {
      setAmount(String(quickAmount));
      setAmountAsNumber(quickAmount);
      setKeyboardIsDirty(true);
      setUserHasEnteredAmount(true);
      setNativeFlowError(null);
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
    [currency, trackEvent, createEventBuilder],
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

  const handleContinuePress = useCallback(async () => {
    if (!selectedQuote || !selectedProvider) {
      return;
    }
    setNativeFlowError(null);

    const quoteAmountRaw =
      selectedQuote.quote?.amountIn ??
      (selectedQuote as { amountIn?: number }).amountIn;
    const quoteAmount =
      typeof quoteAmountRaw === 'string'
        ? Number(quoteAmountRaw)
        : quoteAmountRaw;
    const quotePaymentMethod =
      selectedQuote.quote?.paymentMethod ??
      (selectedQuote as { paymentMethod?: string }).paymentMethod;

    if (selectedQuote.provider !== selectedProvider.id) {
      return;
    }

    if (quoteAmount !== amountAsNumber || Number.isNaN(quoteAmount)) {
      return;
    }

    if (quotePaymentMethod != null) {
      if (
        !selectedPaymentMethod ||
        selectedPaymentMethod.id !== quotePaymentMethod
      ) {
        return;
      }
    }

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
        Logger.error(error as Error, {
          message: 'Failed to route native provider flow',
        });
        setNativeFlowError(
          parseUserFacingError(
            error,
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
      } finally {
        setIsContinueLoading(false);
      }
      return;
    }

    setIsContinueLoading(true);
    try {
      const buyWidget = await getBuyWidgetData(selectedQuote);

      if (buyWidget?.url) {
        const isCustomAction = Boolean(
          (selectedQuote.quote as { isCustomAction?: boolean })?.isCustomAction,
        );
        const providerCode = normalizeProviderCode(selectedQuote.provider);
        const chainId = selectedToken?.chainId as CaipChainId | undefined;
        const network = chainId?.includes(':')
          ? chainId.split(':')[1] || ''
          : chainId || '';
        const effectiveWallet = walletAddress ?? '';

        const useExternalBrowser =
          isCustomAction || buyWidget.browser === 'IN_APP_OS_BROWSER';
        if (useExternalBrowser) {
          const effectiveOrderId = buyWidget.orderId?.trim() || null;
          if (effectiveOrderId && effectiveWallet) {
            addPrecreatedOrder({
              orderId: effectiveOrderId,
              providerCode,
              walletAddress: effectiveWallet,
              chainId: network || undefined,
            });
          }
          if (Device.isAndroid() || !(await InAppBrowser.isAvailable())) {
            await Linking.openURL(buyWidget.url);
          } else {
            const redirectUrl = getRampCallbackBaseUrl();
            try {
              await InAppBrowser.openAuth(buyWidget.url, redirectUrl);
            } finally {
              InAppBrowser.closeAuth();
            }
          }
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
      } else {
        Logger.error(
          new Error('No widget URL available for aggregator provider'),
          { provider: selectedQuote.provider },
        );
        setNativeFlowError(strings('deposit.buildQuote.unexpectedError'));
      }
    } catch (error) {
      Logger.error(error as Error, {
        provider: selectedQuote.provider,
        message: 'Failed to fetch widget URL',
      });
      setNativeFlowError(
        parseUserFacingError(
          error,
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
    amountAsNumber,
    selectedPaymentMethod,
    transakCheckExistingToken,
    transakGetBuyQuote,
    transakRouteAfterAuth,
    rampRoutingDecision,
    userRegion?.regionCode,
    trackEvent,
    createEventBuilder,
  ]);

  const hasAmount = amountAsNumber > 0;

  const quoteMatchesCurrentContext = useMemo(() => {
    if (!selectedQuote || !selectedProvider) return false;

    const quoteAmountRaw =
      selectedQuote.quote?.amountIn ??
      (selectedQuote as { amountIn?: number }).amountIn;
    const quoteAmount =
      typeof quoteAmountRaw === 'string'
        ? Number(quoteAmountRaw)
        : quoteAmountRaw;
    const quotePaymentMethod =
      selectedQuote.quote?.paymentMethod ??
      (selectedQuote as { paymentMethod?: string }).paymentMethod;

    // Provider must match (prevents using a stale quote for a different provider)
    if (selectedQuote.provider !== selectedProvider.id) return false;

    // Amount must match (normalize: API may return amountIn as string)
    if (quoteAmount !== amountAsNumber || Number.isNaN(quoteAmount))
      return false;

    // Payment method context must match
    if (quotePaymentMethod != null) {
      // Quote requires a payment method - must have one selected and it must match
      if (
        !selectedPaymentMethod ||
        selectedPaymentMethod.id !== quotePaymentMethod
      ) {
        return false;
      }
    }

    return true;
  }, [selectedQuote, selectedProvider, amountAsNumber, selectedPaymentMethod]);

  const canContinue =
    hasAmount &&
    !selectedQuoteLoading &&
    selectedQuote !== null &&
    quoteMatchesCurrentContext;

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
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.centerGroup}>
            <View style={styles.amountContainer}>
              <Text
                testID={BuildQuoteSelectors.AMOUNT_INPUT}
                variant={TextVariant.HeadingLG}
                color={
                  nativeFlowError || hasNoQuotes || quoteFetchError
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
                {nativeFlowError ? (
                  <TruncatedError
                    error={nativeFlowError}
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
  );
}

export default BuildQuote;
