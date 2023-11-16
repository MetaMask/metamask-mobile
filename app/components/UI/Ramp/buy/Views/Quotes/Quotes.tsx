import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  CryptoCurrency,
  FiatCurrency,
  ProviderBuyFeatureBrowserEnum,
  QuoteError,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import { Provider } from '@consensys/on-ramp-sdk/dist/API';

import styleSheet from './Quotes.styles';
import LoadingQuotes from './LoadingQuotes';
import Text from '../../../../../Base/Text';
import ScreenLayout from '../../../common/components/ScreenLayout';
import ErrorViewWithReporting from '../../../common/components/ErrorViewWithReporting';
import ErrorView from '../../../common/components/ErrorView';
import Row from '../../../common/components/Row';
import Quote from '../../../common/components/Quote';
import InfoAlert from '../../../common/components/InfoAlert';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';

import useAnalytics from '../../../common/hooks/useAnalytics';
import useQuotes from '../../hooks/useQuotes';
import { useRampSDK } from '../../../common/sdk';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import LoadingAnimation from '../../../common/components/LoadingAnimation';
import useInterval from '../../../../../hooks/useInterval';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import useInAppBrowser from '../../hooks/useInAppBrowser';
import { createCheckoutNavDetails } from '../Checkout';
import { PROVIDER_LINKS, ScreenLocation } from '../../../common/types';
import Logger from '../../../../../../util/Logger';
import Timer from './Timer';
import { isBuyQuote, isBuyQuotes, isSellQuotes } from '../../../common/utils';

export interface QuotesParams {
  amount: number;
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
    selectedChainId,
    appConfig,
    callbackBaseUrl,
    sdkError,
    rampType,
    isBuy,
  } = useRampSDK();
  const renderInAppBrowser = useInAppBrowser();

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
    data: quotes,
    isFetching: isFetchingQuotes,
    error: ErrorFetchingQuotes,
    query: fetchQuotes,
  } = useQuotes(params.amount);

  const filteredQuotes = useMemo(() => {
    if (quotes) {
      if (isBuyQuotes(quotes, rampType)) {
        return quotes.filter((quote): quote is QuoteResponse => !quote.error);
      } else if (isSellQuotes(quotes, rampType)) {
        return quotes.filter(
          (quote): quote is SellQuoteResponse => !quote.error,
        );
      }
    }
    return [];
  }, [quotes, rampType]);

  const handleCancelPress = useCallback(() => {
    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: 'Quotes Screen',
        chain_id_destination: selectedChainId,
        results_count: filteredQuotes.length,
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: 'Quotes Screen',
        chain_id_source: selectedChainId,
        results_count: filteredQuotes.length,
      });
    }
  }, [filteredQuotes.length, isBuy, selectedChainId, trackEvent]);

  const handleFetchQuotes = useCallback(() => {
    setIsLoading(true);
    setIsInPolling(true);
    setPollingCyclesLeft(appConfig.POLLING_CYCLES - 1);
    setRemainingTime(appConfig.POLLING_INTERVAL);
    fetchQuotes();

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
        chain_id_destination: selectedChainId,
      });
    } else {
      trackEvent('OFFRAMP_QUOTES_REQUESTED', {
        ...payload,
        currency_destination: params.fiatCurrency?.symbol,
        currency_source: params.asset?.symbol,
        chain_id_source: selectedChainId,
      });
    }
  }, [
    appConfig.POLLING_CYCLES,
    appConfig.POLLING_INTERVAL,
    fetchQuotes,
    isBuy,
    params,
    selectedChainId,
    selectedPaymentMethodId,
    trackEvent,
  ]);

  const handleOnQuotePress = useCallback(
    (quote: QuoteResponse | SellQuoteResponse) => {
      setProviderId(quote.provider.id);
    },
    [],
  );

  const handleInfoPress = useCallback(
    (quote) => {
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

  const handleOnPressCTA = useCallback(
    async (quote: QuoteResponse | SellQuoteResponse, index) => {
      try {
        setIsQuoteLoading(true);

        const totalFee =
          (quote.networkFee ?? 0) +
          (quote.providerFee ?? 0) +
          (quote.extraFee ?? 0);

        const payload = {
          refresh_count: appConfig.POLLING_CYCLES - pollingCyclesLeft,
          quote_position: index + 1,
          results_count: filteredQuotes.length,
          payment_method_id: selectedPaymentMethodId as string,
          total_fee: totalFee,
          gas_fee: quote.networkFee ?? 0,
          processing_fee: quote.providerFee ?? 0,
          exchange_rate:
            ((quote.amountIn ?? 0) - totalFee) / (quote.amountOut ?? 0),
        };

        if (isBuy) {
          trackEvent('ONRAMP_PROVIDER_SELECTED', {
            ...payload,
            currency_source: params.fiatCurrency?.symbol,
            currency_destination: params.asset?.symbol,
            provider_onramp: quote.provider.name,
            crypto_out: quote.amountOut ?? 0,
            chain_id_destination: selectedChainId,
          });
        } else {
          trackEvent('OFFRAMP_PROVIDER_SELECTED', {
            ...payload,
            currency_destination: params.fiatCurrency?.symbol,
            currency_source: params.asset?.symbol,
            provider_offramp: quote.provider.name,
            fiat_out: quote.amountOut ?? 0,
            chain_id_source: selectedChainId,
          });
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
          const { url, orderId: customOrderId } = await buyAction.createWidget(
            callbackBaseUrl,
          );
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
      isBuy,
      appConfig.POLLING_CYCLES,
      callbackBaseUrl,
      filteredQuotes.length,
      navigation,
      params,
      pollingCyclesLeft,
      rampType,
      renderInAppBrowser,
      selectedChainId,
      selectedPaymentMethodId,
      trackEvent,
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
    isInPolling && !isFetchingQuotes ? 1000 : null,
  );

  useEffect(() => {
    if (
      !firstFetchCompleted &&
      !isInPolling &&
      !ErrorFetchingQuotes &&
      !isFetchingQuotes &&
      filteredQuotes &&
      filteredQuotes.length
    ) {
      setFirstFetchCompleted(true);
      setIsInPolling(true);
    }
  }, [
    ErrorFetchingQuotes,
    filteredQuotes,
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
      getFiatOnRampAggNavbar(
        navigation,
        { title: strings('fiat_on_ramp_aggregator.select_a_quote') },
        theme.colors,
        handleCancelPress,
      ),
    );
  }, [navigation, theme.colors, handleCancelPress]);

  useEffect(() => {
    if (isFetchingQuotes) return;
    setShouldFinishAnimation(true);
  }, [isFetchingQuotes]);

  useEffect(() => {
    if (quotes && !isFetchingQuotes && pollingCyclesLeft >= 0) {
      const quotesWithoutError = filteredQuotes as (
        | QuoteResponse
        | SellQuoteResponse
      )[];
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
        };

        const averageOut = totals.amountOut / quotesWithoutError.length;
        const providerList = quotesWithoutError.map(
          ({ provider }) => provider.name,
        );
        const providerFirst = quotesWithoutError[0]?.provider?.name;
        const providerLast =
          quotesWithoutError.length > 1
            ? quotesWithoutError[quotesWithoutError.length - 1]?.provider?.name
            : undefined;

        if (isBuy) {
          trackEvent('ONRAMP_QUOTES_RECEIVED', {
            ...payload,
            currency_source: params.fiatCurrency?.symbol,
            currency_destination: params.asset?.symbol,
            average_crypto_out: averageOut,
            chain_id_destination: selectedChainId,
            provider_onramp_list: providerList,
            provider_onramp_first: providerFirst,
            provider_onramp_last: providerLast,
          });
        } else {
          trackEvent('OFFRAMP_QUOTES_RECEIVED', {
            ...payload,
            currency_destination: params.fiatCurrency?.symbol,
            currency_source: params.asset?.symbol,
            average_fiat_out: averageOut,
            chain_id_source: selectedChainId,
            provider_offramp_list: providerList,
            provider_offramp_first: providerFirst,
            provider_offramp_last: providerLast,
          });
        }
      }

      (quotes as (QuoteResponse | SellQuoteResponse | QuoteError)[])
        .filter((quote): quote is QuoteError => Boolean(quote.error))
        .forEach((quoteError) => {
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
              provider_onramp: quoteError.provider.name,
              chain_id_destination: selectedChainId,
            });
          } else {
            trackEvent('OFFRAMP_QUOTE_ERROR', {
              ...payload,
              currency_destination: params.fiatCurrency?.symbol,
              currency_source: params.asset?.symbol,
              provider_offramp: quoteError.provider.name,
              chain_id_source: selectedChainId,
            });
          }
        });
    }
  }, [
    appConfig.POLLING_CYCLES,
    filteredQuotes,
    isBuy,
    isFetchingQuotes,
    params,
    pollingCyclesLeft,
    quotes,
    rampType,
    selectedChainId,
    selectedPaymentMethodId,
    trackEvent,
  ]);

  useEffect(() => {
    if (filteredQuotes && filteredQuotes.length > 0) {
      setProviderId(filteredQuotes[0].provider?.id);
    }
  }, [filteredQuotes]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} location={'Quotes Screen'} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (ErrorFetchingQuotes) {
    return (
      <ErrorView
        description={ErrorFetchingQuotes}
        ctaOnPress={handleFetchQuotes}
        location={'Quotes Screen'}
      />
    );
  }

  if (pollingCyclesLeft < 0) {
    return (
      <ErrorView
        icon="expired"
        title={strings('fiat_on_ramp_aggregator.quotes_timeout')}
        description={strings('fiat_on_ramp_aggregator.request_new_quotes')}
        ctaLabel={strings('fiat_on_ramp_aggregator.get_new_quotes')}
        ctaOnPress={handleFetchQuotes}
        location={'Quotes Screen'}
      />
    );
  }

  if (isLoading) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <LoadingAnimation
            title={strings('fiat_on_ramp_aggregator.fetching_quotes')}
            finish={shouldFinishAnimation}
            onAnimationEnd={() => setIsLoading(false)}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  // No providers available
  if (!isFetchingQuotes && filteredQuotes.length === 0) {
    return (
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
    );
  }

  return (
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
          <Text centered grey>
            {strings('fiat_on_ramp_aggregator.compare_rates')}
          </Text>
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
        <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
          <ScreenLayout.Content style={styles.withoutTopPadding}>
            {isFetchingQuotes && isInPolling ? (
              <LoadingQuotes />
            ) : (
              filteredQuotes.map((quote, index) => (
                <Row key={quote.provider.id}>
                  <Quote
                    isLoading={isQuoteLoading}
                    quote={quote}
                    onPress={() => handleOnQuotePress(quote)}
                    onPressCTA={() => handleOnPressCTA(quote, index)}
                    highlighted={quote.provider.id === providerId}
                    showInfo={() => handleInfoPress(quote)}
                    rampType={rampType}
                  />
                </Row>
              ))
            )}
          </ScreenLayout.Content>
        </Animated.ScrollView>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default Quotes;
