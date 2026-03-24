import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import {
  CryptoCurrency,
  FiatCurrency,
  ProviderBuyFeatureBrowserEnum,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import { PaymentCustomAction, Provider } from '@consensys/on-ramp-sdk/dist/API';
import styleSheet from './Quotes.styles';
import LoadingQuotes from './LoadingQuotes';
import Timer from './Timer';
import TextLegacy from '../../../../../Base/Text';
import ScreenLayout from '../../components/ScreenLayout';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';
import ErrorView from '../../components/ErrorView';
import Row from '../../components/Row';
import Quote from '../../components/Quote';
import CustomAction from '../../components/CustomAction';
import InfoAlert from '../../components/InfoAlert';
import { getDepositNavbarOptions } from '../../../../Navbar';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';

import useAnalytics from '../../../hooks/useAnalytics';
import useQuotesAndCustomActions from '../../hooks/useQuotesAndCustomActions';
import { useRampSDK } from '../../sdk';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import LoadingAnimation from '../../components/LoadingAnimation';
import useInterval from '../../../../../hooks/useInterval';
import useInAppBrowser from '../../hooks/useInAppBrowser';
import { createCheckoutNavDetails } from '../Checkout/Checkout';
import { PROVIDER_LINKS, ScreenLocation } from '../../types';
import Logger from '../../../../../../util/Logger';
import { isBuyQuote } from '../../utils';
import { getOrdersProviders } from '../../../../../../reducers/fiatOrders';
import { QuoteSelectors } from './Quotes.testIds';
import useFiatCurrencies from '../../hooks/useFiatCurrencies';
import { endTrace, TraceName } from '../../../../../../util/trace';

export interface QuotesParams {
  amount: number | string;
  asset: CryptoCurrency;
  fiatCurrency: FiatCurrency;
}

export const createQuotesNavDetails = createNavigationDetails<QuotesParams>(
  Routes.RAMP.QUOTES,
);

function Quotes() {
  const navigation = useNavigation();
  const trackEvent = useAnalytics();
  const params = useParams<QuotesParams>();

  const {
    selectedPaymentMethodId,
    appConfig,
    callbackBaseUrl,
    sdkError,
    rampType,
    isBuy,
    selectedRegion,
    selectedAsset,
    selectedAddress,
    selectedFiatCurrencyId,
    sdk,
  } = useRampSDK();

  const { currentFiatCurrency } = useFiatCurrencies();

  const renderInAppBrowser = useInAppBrowser();

  const ordersProviders = useSelector(getOrdersProviders);
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [shouldFinishAnimation, setShouldFinishAnimation] = useState(false);

  const [firstFetchCompleted, setFirstFetchCompleted] = useState(false);
  const [isInPolling, setIsInPolling] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [showProviderInfo, setShowProviderInfo] = useState(false);
  const [selectedProviderInfo, setSelectedProviderInfo] =
    useState<Provider | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [pollingCyclesLeft, setPollingCyclesLeft] = useState(
    appConfig.POLLING_CYCLES - 1,
  );
  const [remainingTime, setRemainingTime] = useState(
    appConfig.POLLING_INTERVAL,
  );
  const { styles, theme } = useStyles(styleSheet, {});

  const scrollOffsetY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollOffsetY.value = event.contentOffset.y;
  });
  const animatedStyles = useAnimatedStyle(() => {
    const value = interpolate(
      scrollOffsetY.value,
      [0, 50],
      [0, 1],
      Extrapolate.EXTEND,
    );
    return { opacity: value };
  });

  const {
    recommendedQuote,
    recommendedCustomAction,
    quotesWithoutError,
    quotesWithError,
    quotesByPriceWithoutError,
    customActions,
    isFetching: isFetchingQuotes,
    error: ErrorFetchingQuotes,
    query: fetchQuotes,
  } = useQuotesAndCustomActions(params.amount);

  const handleCancelPress = useCallback(() => {
    const chainId = params.asset?.network?.chainId;
    if (!chainId) return;

    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: 'Quotes Screen',
        chain_id_destination: chainId,
        results_count: quotesByPriceWithoutError.length,
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: 'Quotes Screen',
        chain_id_source: chainId,
        results_count: quotesByPriceWithoutError.length,
      });
    }
  }, [
    quotesByPriceWithoutError.length,
    isBuy,
    params.asset?.network?.chainId,
    trackEvent,
  ]);

  const handleClosePress = useCallback(
    (bottomSheetDialogRef: React.RefObject<BottomSheetRef>) => {
      handleCancelPress();
      if (bottomSheetDialogRef?.current) {
        bottomSheetDialogRef.current.onCloseBottomSheet();
      } else {
        navigation.goBack();
      }
    },
    [handleCancelPress, navigation],
  );

  const handleFetchQuotes = useCallback(() => {
    setIsLoading(true);
    setIsInPolling(true);
    setPollingCyclesLeft(appConfig.POLLING_CYCLES - 1);
    setRemainingTime(appConfig.POLLING_INTERVAL);
    fetchQuotes();

    const chainId = params.asset?.network?.chainId;
    if (!chainId) return;

    const payload = {
      payment_method_id: selectedPaymentMethodId as string,
      amount: params.amount,
      location: 'Quotes Screen' as ScreenLocation,
    };

    if (isBuy) {
      trackEvent('ONRAMP_QUOTES_REQUESTED', {
        ...payload,
        currency_source: params.fiatCurrency?.symbol,
        currency_destination: params.asset?.symbol,
        currency_destination_symbol: params.asset?.symbol,
        currency_destination_network: params.asset?.network?.shortName,
        chain_id_destination: chainId,
      });
    } else {
      trackEvent('OFFRAMP_QUOTES_REQUESTED', {
        ...payload,
        currency_destination: params.fiatCurrency?.symbol,
        currency_source: params.asset?.symbol,
        currency_source_symbol: params.asset?.symbol,
        currency_source_network: params.asset?.network?.shortName,
        chain_id_source: chainId,
      });
    }
  }, [
    appConfig.POLLING_CYCLES,
    appConfig.POLLING_INTERVAL,
    fetchQuotes,
    isBuy,
    params,
    selectedPaymentMethodId,
    trackEvent,
  ]);

  const handleExpandQuotes = useCallback(() => {
    setIsExpanded(true);
    const chainId = params.asset?.network?.chainId;
    if (!chainId) return;

    const payload = {
      payment_method_id: selectedPaymentMethodId as string,
      amount: params.amount,
      refresh_count: appConfig.POLLING_CYCLES - pollingCyclesLeft,
      results_count: quotesByPriceWithoutError.length,
      provider_onramp_first: quotesByPriceWithoutError[0]?.provider?.name,
      provider_onramp_list: quotesByPriceWithoutError.map(
        ({ provider }) => provider.name,
      ),
      previously_used_count: quotesByPriceWithoutError.filter(({ provider }) =>
        ordersProviders.includes(provider.id),
      ).length,
    };
    if (isBuy) {
      trackEvent('ONRAMP_QUOTES_EXPANDED', {
        ...payload,
        chain_id_destination: chainId,
        currency_source: params.fiatCurrency?.symbol,
        currency_destination: params.asset?.symbol,
        currency_destination_symbol: params.asset?.symbol,
        currency_destination_network: params.asset?.network?.shortName,
      });
    } else {
      trackEvent('OFFRAMP_QUOTES_EXPANDED', {
        ...payload,
        chain_id_source: chainId,
        currency_source: params.asset?.symbol,
        currency_source_symbol: params.asset?.symbol,
        currency_source_network: params.asset?.network?.shortName,
        currency_destination: params.fiatCurrency?.symbol,
      });
    }
  }, [
    params.asset?.network?.shortName,
    appConfig.POLLING_CYCLES,
    quotesByPriceWithoutError,
    isBuy,
    ordersProviders,
    params.amount,
    params.asset?.symbol,
    params.asset?.network?.chainId,
    params.fiatCurrency?.symbol,
    pollingCyclesLeft,
    selectedPaymentMethodId,
    trackEvent,
  ]);

  const handleOnCustomActionPress = useCallback(
    (customAction: PaymentCustomAction) => {
      setProviderId(customAction?.buy?.provider.id);
    },
    [],
  );

  const handleOnQuotePress = useCallback(
    (quote: QuoteResponse | SellQuoteResponse) => {
      setProviderId(quote.provider.id);
    },
    [],
  );

  const handleInfoPress = useCallback(
    (quote: { provider: Provider }) => {
      if (quote?.provider) {
        setSelectedProviderInfo(quote.provider);
        setShowProviderInfo(true);

        if (isBuy) {
          trackEvent('ONRAMP_PROVIDER_DETAILS_VIEWED', {
            provider_onramp: quote.provider.name,
          });
        } else {
          trackEvent('OFFRAMP_PROVIDER_DETAILS_VIEWED', {
            provider_offramp: quote.provider.name,
          });
        }
      }
    },
    [isBuy, trackEvent],
  );

  const handleOnPressCustomActionCTA = useCallback(
    async (customAction: PaymentCustomAction) => {
      if (!sdk || !customAction) {
        return;
      }

      try {
        setIsQuoteLoading(true);
        const provider = customAction.buy.provider;
        const chainId = params.asset?.network?.chainId;

        if (chainId) {
          const payload = {
            region: selectedRegion?.id as string,
            payment_method_id: selectedPaymentMethodId as string,
          };

          if (isBuy) {
            trackEvent('ONRAMP_DIRECT_PROVIDER_CLICKED', {
              ...payload,
              currency_source: currentFiatCurrency?.symbol as string,
              currency_destination: selectedAsset?.symbol as string,
              currency_destination_symbol: selectedAsset?.symbol as string,
              currency_destination_network: selectedAsset?.network?.shortName,
              provider_onramp: provider.name,
              chain_id_destination: chainId,
            });
          } else {
            trackEvent('OFFRAMP_DIRECT_PROVIDER_CLICKED', {
              ...payload,
              currency_destination: currentFiatCurrency?.symbol as string,
              currency_source: selectedAsset?.symbol as string,
              currency_source_symbol: selectedAsset?.symbol as string,
              currency_source_network: selectedAsset?.network?.shortName,
              provider_offramp: provider.name,
              chain_id_source: chainId,
            });
          }
        }

        const getUrlMethod = isBuy ? 'getBuyUrl' : 'getSellUrl';

        const buyAction = await sdk[getUrlMethod](
          provider,
          selectedRegion?.id as string,
          selectedPaymentMethodId as string,
          selectedAsset?.id as string,
          selectedFiatCurrencyId as string,
          params.amount as number,
          selectedAddress as string,
        );

        if (buyAction.browser === ProviderBuyFeatureBrowserEnum.AppBrowser) {
          const { url, orderId: customOrderId } =
            await buyAction.createWidget(callbackBaseUrl);

          navigation.navigate(
            ...createCheckoutNavDetails({
              url,
              provider,
              customOrderId,
            }),
          );
        } else if (
          buyAction.browser === ProviderBuyFeatureBrowserEnum.InAppOsBrowser
        ) {
          await renderInAppBrowser(
            buyAction,
            provider,
            params.amount as number,
            currentFiatCurrency?.symbol,
          );
        } else {
          throw new Error('Unsupported browser type: ' + buyAction.browser);
        }
      } catch (error) {
        Logger.error(error as Error, {
          message:
            'FiatOrders::CustomActionButton error while getting buy action',
        });
      } finally {
        setIsQuoteLoading(false);
      }
    },
    [
      sdk,
      selectedRegion?.id,
      selectedPaymentMethodId,
      isBuy,
      selectedFiatCurrencyId,
      params.amount,
      selectedAddress,
      trackEvent,
      currentFiatCurrency?.symbol,
      callbackBaseUrl,
      navigation,
      renderInAppBrowser,
      selectedAsset,
      params.asset?.network?.chainId,
    ],
  );

  const handleOnPressCTA = useCallback(
    async (quote: QuoteResponse | SellQuoteResponse, index: number) => {
      try {
        setIsQuoteLoading(true);

        const chainId = params.asset?.network?.chainId;
        if (chainId) {
          const totalFee =
            (quote.networkFee ?? 0) +
            (quote.providerFee ?? 0) +
            (quote.extraFee ?? 0);

          const payload = {
            refresh_count: appConfig.POLLING_CYCLES - pollingCyclesLeft,
            quote_position: index + 1,
            results_count: quotesByPriceWithoutError.length,
            payment_method_id: selectedPaymentMethodId as string,
            total_fee: totalFee,
            gas_fee: quote.networkFee ?? 0,
            processing_fee: quote.providerFee ?? 0,
            exchange_rate:
              ((quote.amountIn ?? 0) - totalFee) / (quote.amountOut ?? 0),
            amount: params.amount,
            is_most_reliable: quote.tags.isMostReliable,
            is_best_rate: quote.tags.isBestRate,
            is_recommended:
              !isExpanded &&
              quote.provider.id === recommendedQuote?.provider.id,
          };

          if (isBuy) {
            trackEvent('ONRAMP_PROVIDER_SELECTED', {
              ...payload,
              currency_source: params.fiatCurrency?.symbol,
              currency_destination: params.asset?.symbol,
              currency_destination_symbol: params.asset?.symbol,
              currency_destination_network: params.asset?.network?.shortName,
              provider_onramp: quote.provider.name,
              crypto_out: quote.amountOut ?? 0,
              chain_id_destination: chainId,
            });
          } else {
            trackEvent('OFFRAMP_PROVIDER_SELECTED', {
              ...payload,
              currency_destination: params.fiatCurrency?.symbol,
              currency_source: params.asset?.symbol,
              currency_source_symbol: params.asset?.symbol,
              currency_source_network: params.asset?.network?.shortName,
              provider_offramp: quote.provider.name,
              fiat_out: quote.amountOut ?? 0,
              chain_id_source: chainId,
            });
          }
        }

        let buyAction;
        if (isBuyQuote(quote, rampType)) {
          buyAction = await quote.buy();
        } else {
          buyAction = await quote.sell();
        }

        if (
          buyAction.browser === ProviderBuyFeatureBrowserEnum.InAppOsBrowser
        ) {
          await renderInAppBrowser(
            buyAction,
            quote.provider,
            quote.amountIn as number,
            quote.fiat?.symbol,
          );
        } else if (
          buyAction.browser === ProviderBuyFeatureBrowserEnum.AppBrowser
        ) {
          const { url, orderId: customOrderId } =
            await buyAction.createWidget(callbackBaseUrl);
          navigation.navigate(
            ...createCheckoutNavDetails({
              provider: quote.provider,
              url,
              customOrderId,
            }),
          );
        } else {
          throw new Error('Unsupported browser type: ' + buyAction.browser);
        }
      } catch (error) {
        Logger.error(error as Error, {
          message: 'FiatOnRampAgg::Quotes error onPressBuy',
        });
      } finally {
        setIsQuoteLoading(false);
      }
    },
    [
      params.asset?.network?.shortName,
      appConfig.POLLING_CYCLES,
      pollingCyclesLeft,
      quotesByPriceWithoutError.length,
      selectedPaymentMethodId,
      params.amount,
      params.fiatCurrency?.symbol,
      params.asset?.symbol,
      isExpanded,
      recommendedQuote?.provider.id,
      isBuy,
      rampType,
      trackEvent,
      renderInAppBrowser,
      callbackBaseUrl,
      navigation,
      params.asset?.network?.chainId,
    ],
  );

  useInterval(
    () => {
      setRemainingTime((prevRemainingTime) => {
        const newRemainingTime = Number(prevRemainingTime - 1000);

        if (newRemainingTime <= 0) {
          setPollingCyclesLeft((cycles) => cycles - 1);
          if (pollingCyclesLeft > 0) {
            setProviderId(null);
            fetchQuotes();
          }
        }

        return newRemainingTime > 0
          ? newRemainingTime
          : appConfig.POLLING_INTERVAL;
      });
    },
    { delay: isInPolling && !isFetchingQuotes ? 1000 : null },
  );

  useEffect(() => {
    if (
      !firstFetchCompleted &&
      !isInPolling &&
      !ErrorFetchingQuotes &&
      !isFetchingQuotes &&
      quotesByPriceWithoutError?.length
    ) {
      setFirstFetchCompleted(true);
      setIsInPolling(true);
    }
  }, [
    ErrorFetchingQuotes,
    quotesByPriceWithoutError,
    firstFetchCompleted,
    isFetchingQuotes,
    isInPolling,
  ]);

  useEffect(() => {
    if (pollingCyclesLeft < 0 || ErrorFetchingQuotes) {
      setIsInPolling(false);
      setShowProviderInfo(false);
      setProviderId(null);
    }
  }, [ErrorFetchingQuotes, pollingCyclesLeft]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('fiat_on_ramp_aggregator.select_a_quote') },
        theme,
        handleCancelPress,
      ),
    );
  }, [navigation, theme, handleCancelPress]);

  useEffect(() => {
    if (isFetchingQuotes) return;
    setShouldFinishAnimation(true);
  }, [isFetchingQuotes]);

  useEffect(() => {
    if (
      quotesWithoutError &&
      quotesWithError &&
      !isFetchingQuotes &&
      pollingCyclesLeft >= 0
    ) {
      if (quotesWithoutError.length > 0) {
        const totals = quotesWithoutError.reduce(
          (acc, curr) => {
            const totalFee =
              acc.totalFee +
              ((curr.networkFee ?? 0) +
                (curr.providerFee ?? 0) +
                (curr.extraFee ?? 0));
            return {
              amountOut: acc.amountOut + (curr.amountOut ?? 0),
              totalFee,
              totalGasFee: acc.totalGasFee + (curr.networkFee ?? 0),
              totalProcessingFee:
                acc.totalProcessingFee + (curr.providerFee ?? 0),
              feeAmountRatio:
                acc.feeAmountRatio + totalFee / (curr.amountOut ?? 0),
            };
          },
          {
            amountOut: 0,
            totalFee: 0,
            totalGasFee: 0,
            totalProcessingFee: 0,
            feeAmountRatio: 0,
          },
        );

        const averageOut = totals.amountOut / quotesWithoutError.length;
        const providerList = quotesWithoutError.map(
          ({ provider }) => provider.name,
        );
        const providerFirst = quotesWithoutError[0]?.provider?.name;
        const providerLast =
          quotesWithoutError.length > 1
            ? quotesWithoutError[quotesWithoutError.length - 1]?.provider?.name
            : undefined;

        const providerMostReliable = quotesWithoutError.find(
          (quote) => quote.tags.isMostReliable,
        )?.provider?.name;

        const providerBestPrice = quotesWithoutError.find(
          (quote) => quote.tags.isBestRate,
        )?.provider?.name;

        const amountList = quotesWithoutError.map(({ amountOut }) => amountOut);
        const amountFirst = quotesWithoutError[0]?.amountOut;
        const amountLast =
          quotesWithoutError.length > 1
            ? quotesWithoutError[quotesWithoutError.length - 1]?.amountOut
            : undefined;

        const payload = {
          amount: params.amount,
          payment_method_id: selectedPaymentMethodId as string,
          refresh_count: appConfig.POLLING_CYCLES - pollingCyclesLeft,
          results_count: quotesWithoutError.length,
          average_total_fee: totals.totalFee / quotesWithoutError.length,
          average_gas_fee: totals.totalGasFee / quotesWithoutError.length,
          average_processing_fee:
            totals.totalProcessingFee / quotesWithoutError.length,
          average_total_fee_of_amount:
            totals.feeAmountRatio / quotesWithoutError.length,
          quotes_amount_list: amountList as number[],
          quotes_amount_first: amountFirst as number,
          quotes_amount_last: amountLast as number,
        };

        const chainId = params.asset?.network?.chainId;
        if (chainId) {
          if (isBuy) {
            trackEvent('ONRAMP_QUOTES_RECEIVED', {
              ...payload,
              currency_source: params.fiatCurrency?.symbol,
              currency_destination: params.asset?.symbol,
              currency_destination_symbol: params.asset?.symbol,
              currency_destination_network: params.asset?.network?.shortName,
              average_crypto_out: averageOut,
              chain_id_destination: chainId,
              provider_onramp_list: providerList,
              provider_onramp_first: providerFirst,
              provider_onramp_last: providerLast,
              provider_onramp_most_reliable: providerMostReliable,
              provider_onramp_best_price: providerBestPrice,
            });
          } else {
            trackEvent('OFFRAMP_QUOTES_RECEIVED', {
              ...payload,
              currency_destination: params.fiatCurrency?.symbol,
              currency_source: params.asset?.symbol,
              currency_source_symbol: params.asset?.symbol,
              currency_source_network: params.asset?.network?.shortName,
              average_fiat_out: averageOut,
              chain_id_source: chainId,
              provider_offramp_list: providerList,
              provider_offramp_first: providerFirst,
              provider_offramp_last: providerLast,
              provider_offramp_most_reliable: providerMostReliable,
              provider_offramp_best_price: providerBestPrice,
            });
          }
        }

        endTrace({ name: TraceName.RampQuoteLoading });
      }

      const chainId = params.asset?.network?.chainId;
      if (chainId) {
        quotesWithError.forEach((quoteError) => {
          const payload = {
            amount: params.amount,
            payment_method_id: selectedPaymentMethodId as string,
            error_message: quoteError.message,
          };
          if (isBuy) {
            trackEvent('ONRAMP_QUOTE_ERROR', {
              ...payload,
              currency_source: params.fiatCurrency?.symbol,
              currency_destination: params.asset?.symbol,
              currency_destination_symbol: params.asset?.symbol,
              currency_destination_network: params.asset?.network?.shortName,
              provider_onramp: quoteError.provider.name,
              chain_id_destination: chainId,
            });
          } else {
            trackEvent('OFFRAMP_QUOTE_ERROR', {
              ...payload,
              currency_destination: params.fiatCurrency?.symbol,
              currency_source: params.asset?.symbol,
              currency_source_symbol: params.asset?.symbol,
              currency_source_network: params.asset?.network?.shortName,
              provider_offramp: quoteError.provider.name,
              chain_id_source: chainId,
            });
          }
        });
      }
    }
  }, [
    appConfig.POLLING_CYCLES,
    quotesByPriceWithoutError,
    isBuy,
    isFetchingQuotes,
    params,
    pollingCyclesLeft,
    rampType,
    selectedPaymentMethodId,
    trackEvent,
    quotesWithError,
    quotesWithoutError,
    params.asset?.network?.chainId,
  ]);

  useEffect(() => {
    const doCustomActionsExist = customActions && customActions.length > 0;
    const firstCustomActionId = customActions?.[0]?.buy?.provider?.id || null;
    const recommendedCustomActionId =
      recommendedCustomAction?.buy?.provider?.id || null;

    const doQuotesExist = quotesWithoutError && quotesWithoutError.length > 0;
    const firstQuoteId = quotesByPriceWithoutError?.[0]?.provider?.id || null;
    const recommendedQuoteId = recommendedQuote?.provider?.id || null;

    if (doCustomActionsExist) {
      if (isExpanded) {
        setProviderId(firstCustomActionId);
        return;
      } else if (recommendedCustomAction) {
        setProviderId(recommendedCustomActionId);
        return;
      }
    }

    if (doQuotesExist) {
      if (isExpanded) {
        setProviderId(firstQuoteId);
        return;
      } else if (recommendedQuote) {
        setProviderId(recommendedQuoteId);
        return;
      }
    }
  }, [
    customActions,
    isExpanded,
    quotesByPriceWithoutError,
    quotesWithoutError,
    recommendedCustomAction,
    recommendedQuote,
  ]);

  useFocusEffect(
    useCallback(() => {
      const hardwareBackPress = () => {
        if (isExpanded) {
          setIsExpanded(false);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        hardwareBackPress,
      );

      return () => subscription.remove();
    }, [isExpanded]),
  );

  if (sdkError) {
    if (!isExpanded) {
      return (
        <BottomSheet>
          <ErrorViewWithReporting
            error={sdkError}
            location={'Quotes Screen'}
            asScreen={false}
          />
        </BottomSheet>
      );
    }

    return (
      <BottomSheet isFullscreen isInteractable={false} ref={bottomSheetRef}>
        <HeaderCompactStandard
          onClose={() => handleClosePress(bottomSheetRef)}
        />
        <ErrorViewWithReporting error={sdkError} location={'Quotes Screen'} />
      </BottomSheet>
    );
  }

  if (ErrorFetchingQuotes) {
    if (!isExpanded) {
      return (
        <BottomSheet>
          <ErrorView
            description={ErrorFetchingQuotes}
            ctaOnPress={handleFetchQuotes}
            location={'Quotes Screen'}
            asScreen={false}
          />
        </BottomSheet>
      );
    }

    return (
      <BottomSheet isFullscreen isInteractable={false} ref={bottomSheetRef}>
        <HeaderCompactStandard
          onClose={() => handleClosePress(bottomSheetRef)}
        />
        <ErrorView
          description={ErrorFetchingQuotes}
          ctaOnPress={handleFetchQuotes}
          location={'Quotes Screen'}
        />
      </BottomSheet>
    );
  }

  if (pollingCyclesLeft < 0) {
    if (!isExpanded) {
      return (
        <BottomSheet>
          <ErrorView
            icon="expired"
            title={strings('fiat_on_ramp_aggregator.quotes_timeout')}
            description={strings('fiat_on_ramp_aggregator.request_new_quotes')}
            ctaLabel={strings('fiat_on_ramp_aggregator.get_new_quotes')}
            ctaOnPress={handleFetchQuotes}
            location={'Quotes Screen'}
            asScreen={false}
          />
        </BottomSheet>
      );
    }
    return (
      <BottomSheet isFullscreen isInteractable={false} ref={bottomSheetRef}>
        <HeaderCompactStandard
          onClose={() => handleClosePress(bottomSheetRef)}
        />
        <ErrorView
          icon="expired"
          title={strings('fiat_on_ramp_aggregator.quotes_timeout')}
          description={strings('fiat_on_ramp_aggregator.request_new_quotes')}
          ctaLabel={strings('fiat_on_ramp_aggregator.get_new_quotes')}
          ctaOnPress={handleFetchQuotes}
          location={'Quotes Screen'}
        />
      </BottomSheet>
    );
  }

  if (isLoading && !firstFetchCompleted) {
    if (!isExpanded) {
      return (
        <BottomSheet>
          <LoadingAnimation
            title={strings('fiat_on_ramp_aggregator.fetching_quotes')}
            finish={shouldFinishAnimation}
            onAnimationEnd={() => setIsLoading(false)}
            asScreen={false}
          />
        </BottomSheet>
      );
    }

    return (
      <BottomSheet isFullscreen isInteractable={false} ref={bottomSheetRef}>
        <HeaderCompactStandard
          onClose={() => handleClosePress(bottomSheetRef)}
        />
        <LoadingAnimation
          title={strings('fiat_on_ramp_aggregator.fetching_quotes')}
          finish={shouldFinishAnimation}
          onAnimationEnd={() => setIsLoading(false)}
        />
      </BottomSheet>
    );
  }

  // No providers available
  if (
    !isFetchingQuotes &&
    quotesByPriceWithoutError.length === 0 &&
    (!customActions || customActions.length === 0)
  ) {
    if (!isExpanded) {
      return (
        <BottomSheet>
          <ErrorView
            title={strings('fiat_on_ramp_aggregator.no_providers_available')}
            description={strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.try_different_amount_to_buy_input'
                : 'fiat_on_ramp_aggregator.try_different_amount_to_sell_input',
            )}
            ctaOnPress={() => navigation.goBack()}
            location={'Quotes Screen'}
            asScreen={false}
          />
        </BottomSheet>
      );
    }

    return (
      <BottomSheet isFullscreen isInteractable={false} ref={bottomSheetRef}>
        <HeaderCompactStandard
          onClose={() => handleClosePress(bottomSheetRef)}
        />
        <ScreenLayout>
          <ErrorView
            title={strings('fiat_on_ramp_aggregator.no_providers_available')}
            description={strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.try_different_amount_to_buy_input'
                : 'fiat_on_ramp_aggregator.try_different_amount_to_sell_input',
            )}
            ctaOnPress={() => navigation.goBack()}
            location={'Quotes Screen'}
          />
        </ScreenLayout>
      </BottomSheet>
    );
  }

  if (!isExpanded) {
    return (
      <BottomSheet ref={bottomSheetRef}>
        <HeaderCompactStandard
          title={strings('fiat_on_ramp_aggregator.recommended_quote')}
          onClose={() => handleClosePress(bottomSheetRef)}
        />

        {isInPolling && (
          <Timer
            pollingCyclesLeft={pollingCyclesLeft}
            isFetchingQuotes={isFetchingQuotes}
            remainingTime={remainingTime}
          />
        )}
        <ScreenLayout.Content style={styles.withoutTopPadding}>
          <ScrollView testID={QuoteSelectors.QUOTES}>
            {isFetchingQuotes && isInPolling ? (
              <LoadingQuotes count={1} />
            ) : recommendedCustomAction ? (
              <CustomAction
                isLoading={isQuoteLoading}
                previouslyUsedProvider={ordersProviders.includes(
                  recommendedCustomAction.buy?.provider?.id,
                )}
                customAction={recommendedCustomAction}
                onPress={() =>
                  handleOnCustomActionPress(recommendedCustomAction)
                }
                onPressCTA={() => {
                  handleOnPressCustomActionCTA(recommendedCustomAction);
                }}
                highlighted={
                  recommendedCustomAction.buy?.provider?.id === providerId
                }
                showInfo={() =>
                  handleInfoPress({
                    provider: recommendedCustomAction?.buy?.provider,
                  })
                }
              />
            ) : recommendedQuote ? (
              <Row key={recommendedQuote.provider.id}>
                <Quote
                  isLoading={isQuoteLoading}
                  previouslyUsedProvider={ordersProviders.includes(
                    recommendedQuote.provider.id,
                  )}
                  quote={recommendedQuote}
                  onPress={() => handleOnQuotePress(recommendedQuote)}
                  onPressCTA={() => handleOnPressCTA(recommendedQuote, 0)}
                  highlighted={recommendedQuote.provider.id === providerId}
                  showInfo={() => handleInfoPress(recommendedQuote)}
                  rampType={rampType}
                />
              </Row>
            ) : null}
          </ScrollView>
        </ScreenLayout.Content>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Vertical}
          buttonPropsArray={
            quotesByPriceWithoutError.length > 1
              ? [
                  {
                    accessible: true,
                    accessibilityRole: 'button',
                    variant: ButtonVariants.Link,
                    size: ButtonSize.Md,
                    label: strings(
                      'fiat_on_ramp_aggregator.explore_more_options',
                    ),
                    onPress: handleExpandQuotes,
                  },
                ]
              : []
          }
        />

        <InfoAlert
          isVisible={showProviderInfo}
          dismiss={() => setShowProviderInfo(false)}
          providerName={selectedProviderInfo?.name}
          logos={selectedProviderInfo?.logos}
          subtitle={selectedProviderInfo?.hqAddress}
          body={selectedProviderInfo?.description}
          providerWebsite={
            selectedProviderInfo?.links?.find(
              (link) => link.name === PROVIDER_LINKS.HOMEPAGE,
            )?.url
          }
          providerPrivacyPolicy={
            selectedProviderInfo?.links?.find(
              (link) => link.name === PROVIDER_LINKS.PRIVACY_POLICY,
            )?.url
          }
          providerTermsOfService={
            selectedProviderInfo?.links?.find(
              (link) => link.name === PROVIDER_LINKS.TOS,
            )?.url
          }
          providerSupport={
            selectedProviderInfo?.links?.find(
              (link) => link.name === PROVIDER_LINKS.SUPPORT,
            )?.url
          }
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet isInteractable={false} isFullscreen ref={bottomSheetRef}>
      <HeaderCompactStandard
        title={strings('fiat_on_ramp_aggregator.select_a_quote')}
        onClose={() => handleClosePress(bottomSheetRef)}
      />
      <ScreenLayout>
        <ScreenLayout.Header>
          {isInPolling && (
            <Timer
              pollingCyclesLeft={pollingCyclesLeft}
              isFetchingQuotes={isFetchingQuotes}
              remainingTime={remainingTime}
            />
          )}

          <ScreenLayout.Content style={styles.withoutVerticalPadding}>
            <TextLegacy centered grey>
              {strings('fiat_on_ramp_aggregator.compare_rates')}
            </TextLegacy>
          </ScreenLayout.Content>
        </ScreenLayout.Header>
        <InfoAlert
          isVisible={showProviderInfo}
          dismiss={() => setShowProviderInfo(false)}
          providerName={selectedProviderInfo?.name}
          logos={selectedProviderInfo?.logos}
          subtitle={selectedProviderInfo?.hqAddress}
          body={selectedProviderInfo?.description}
          providerWebsite={
            selectedProviderInfo?.links?.find(
              (link) => link.name === PROVIDER_LINKS.HOMEPAGE,
            )?.url
          }
          providerPrivacyPolicy={
            selectedProviderInfo?.links?.find(
              (link) => link.name === PROVIDER_LINKS.PRIVACY_POLICY,
            )?.url
          }
          providerSupport={
            selectedProviderInfo?.links?.find(
              (link) => link.name === PROVIDER_LINKS.SUPPORT,
            )?.url
          }
        />
        <ScreenLayout.Body>
          <Animated.View style={[styles.topBorder, animatedStyles]} />
          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            <ScreenLayout.Content
              style={styles.withoutTopPadding}
              testID={QuoteSelectors.EXPANDED_QUOTES_SECTION}
            >
              {isFetchingQuotes && isInPolling ? (
                <LoadingQuotes />
              ) : (
                <>
                  {customActions && customActions.length > 0
                    ? customActions.map((customAction) => (
                        <CustomAction
                          key={customAction.buy?.provider.id}
                          isLoading={isQuoteLoading}
                          previouslyUsedProvider={ordersProviders.includes(
                            customAction.buy?.provider?.id,
                          )}
                          customAction={customAction}
                          onPress={() =>
                            handleOnCustomActionPress(customAction)
                          }
                          onPressCTA={() =>
                            handleOnPressCustomActionCTA(customAction)
                          }
                          highlighted={
                            customAction.buy?.provider?.id === providerId
                          }
                          showInfo={() =>
                            handleInfoPress({
                              provider: customAction?.buy?.provider,
                            })
                          }
                        />
                      ))
                    : null}

                  {quotesByPriceWithoutError.map((quote, index) => (
                    <Row key={quote.provider.id}>
                      <Quote
                        isLoading={isQuoteLoading}
                        previouslyUsedProvider={ordersProviders.includes(
                          quote.provider.id,
                        )}
                        quote={quote}
                        onPress={() => handleOnQuotePress(quote)}
                        onPressCTA={() => handleOnPressCTA(quote, index)}
                        highlighted={quote.provider.id === providerId}
                        showInfo={() => handleInfoPress(quote)}
                        rampType={rampType}
                      />
                    </Row>
                  ))}
                </>
              )}
            </ScreenLayout.Content>
          </Animated.ScrollView>
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
}

export default Quotes;
