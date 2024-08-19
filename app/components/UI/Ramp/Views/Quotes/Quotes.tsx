// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck issue with TS cli finding error but not VS Code plugin

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
  QuoteError,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import { Provider } from '@consensys/on-ramp-sdk/dist/API';

import styleSheet from './Quotes.styles';
import LoadingQuotes from './LoadingQuotes';
import Timer from './Timer';
import TextLegacy from '../../../../Base/Text';
import ScreenLayout from '../../components/ScreenLayout';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';
import ErrorView from '../../components/ErrorView';
import Row from '../../components/Row';
import Quote from '../../components/Quote';
import InfoAlert from '../../components/InfoAlert';
import { getFiatOnRampAggNavbar } from '../../../Navbar';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';

import useAnalytics from '../../hooks/useAnalytics';
import useQuotes from '../../hooks/useQuotes';
import { useRampSDK } from '../../sdk';
import { useStyles } from '../../../../../component-library/hooks';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import LoadingAnimation from '../../components/LoadingAnimation';
import useInterval from '../../../../hooks/useInterval';
import useInAppBrowser from '../../hooks/useInAppBrowser';
import { createCheckoutNavDetails } from '../Checkout';
import { PROVIDER_LINKS, ScreenLocation } from '../../types';
import Logger from '../../../../../util/Logger';
import { isBuyQuote } from '../../utils';
import { getOrdersProviders } from './../../../../../reducers/fiatOrders';

const HIGHLIGHTED_QUOTES_COUNT = 2;
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
    selectedChainId,
    appConfig,
    callbackBaseUrl,
    sdkError,
    rampType,
    isBuy,
  } = useRampSDK();
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
    data: quotes,
    isFetching: isFetchingQuotes,
    error: ErrorFetchingQuotes,
    query: fetchQuotes,
  } = useQuotes(params.amount);

  const [filteredQuotes, highlightedQuotes] = useMemo(() => {
    if (quotes) {
      const allQuotes = quotes.filter(
        (quote): quote is QuoteResponse | SellQuoteResponse => !quote.error,
      );
      const highlightedPreviouslyUsed = allQuotes.findIndex(({ provider }) =>
        ordersProviders.includes(provider.id),
      );

      let reorderedQuotes = allQuotes;
      if (highlightedPreviouslyUsed > -1) {
        reorderedQuotes = [
          allQuotes[highlightedPreviouslyUsed],
          ...allQuotes.slice(0, highlightedPreviouslyUsed),
          ...allQuotes.slice(highlightedPreviouslyUsed + 1),
        ];
      }
      return [
        reorderedQuotes,
        reorderedQuotes.slice(0, HIGHLIGHTED_QUOTES_COUNT),
      ] as const;
    }
    return [[], []] as const;
  }, [ordersProviders, quotes]);

  const expandedCount = filteredQuotes.length - highlightedQuotes.length;

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

  const handleClosePress = useCallback(
    (bottomSheetDialogRef) => {
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

  const handleExpandQuotes = useCallback(() => {
    setIsExpanded(true);
    const payload = {
      payment_method_id: selectedPaymentMethodId as string,
      amount: params.amount,
      refresh_count: appConfig.POLLING_CYCLES - pollingCyclesLeft,
      results_count: filteredQuotes.length,
      provider_onramp_first: filteredQuotes[0]?.provider?.name,
      provider_onramp_list: filteredQuotes.map(({ provider }) => provider.name),
      previously_used_count: filteredQuotes.filter(({ provider }) =>
        ordersProviders.includes(provider.id),
      ).length,
    };
    if (isBuy) {
      trackEvent('ONRAMP_QUOTES_EXPANDED', {
        ...payload,
        chain_id_destination: selectedChainId,
        currency_source: params.fiatCurrency?.symbol,
        currency_destination: params.asset?.symbol,
      });
    } else {
      trackEvent('OFFRAMP_QUOTES_EXPANDED', {
        ...payload,
        chain_id_source: selectedChainId,
        currency_source: params.asset?.symbol,
        currency_destination: params.fiatCurrency?.symbol,
      });
    }
  }, [
    appConfig.POLLING_CYCLES,
    filteredQuotes,
    isBuy,
    ordersProviders,
    params.amount,
    params.asset?.symbol,
    params.fiatCurrency?.symbol,
    pollingCyclesLeft,
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
          amount: params.amount,
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

        const averageOut = totals.amountOut / quotesWithoutError.length;
        const providerList = quotesWithoutError.map(
          ({ provider }) => provider.name,
        );
        const providerFirst = quotesWithoutError[0]?.provider?.name;
        const providerLast =
          quotesWithoutError.length > 1
            ? quotesWithoutError[quotesWithoutError.length - 1]?.provider?.name
            : undefined;
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
        <BottomSheetHeader onClose={() => handleClosePress(bottomSheetRef)} />
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
        <BottomSheetHeader onClose={() => handleClosePress(bottomSheetRef)} />
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
        <BottomSheetHeader onClose={() => handleClosePress(bottomSheetRef)} />
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
        <BottomSheetHeader onClose={() => handleClosePress(bottomSheetRef)} />
        <LoadingAnimation
          title={strings('fiat_on_ramp_aggregator.fetching_quotes')}
          finish={shouldFinishAnimation}
          onAnimationEnd={() => setIsLoading(false)}
        />
      </BottomSheet>
    );
  }

  // No providers available
  if (!isFetchingQuotes && filteredQuotes.length === 0) {
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
        <BottomSheetHeader onClose={() => handleClosePress(bottomSheetRef)} />
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
        <BottomSheetHeader onClose={() => handleClosePress(bottomSheetRef)}>
          {strings('fiat_on_ramp_aggregator.select_a_quote')}
        </BottomSheetHeader>

        {isInPolling && (
          <Timer
            pollingCyclesLeft={pollingCyclesLeft}
            isFetchingQuotes={isFetchingQuotes}
            remainingTime={remainingTime}
          />
        )}
        <ScreenLayout.Content style={styles.withoutTopPadding}>
          <ScrollView>
            {isFetchingQuotes && isInPolling ? (
              <LoadingQuotes count={2} />
            ) : (
              highlightedQuotes.map((quote, index) => (
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
              ))
            )}
          </ScrollView>
        </ScreenLayout.Content>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Vertical}
          buttonPropsArray={
            expandedCount > 0
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
      <BottomSheetHeader onClose={() => handleClosePress(bottomSheetRef)}>
        {strings('fiat_on_ramp_aggregator.select_a_quote')}
      </BottomSheetHeader>
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
            <ScreenLayout.Content style={styles.withoutTopPadding}>
              {isFetchingQuotes && isInPolling ? (
                <LoadingQuotes />
              ) : (
                filteredQuotes.map((quote, index) => (
                  <Fragment key={quote.provider.id}>
                    {index === HIGHLIGHTED_QUOTES_COUNT &&
                      expandedCount > 0 && (
                        <Row>
                          <Text variant={TextVariant.BodyLGMedium}>
                            {expandedCount === 1
                              ? strings(
                                  'fiat_on_ramp_aggregator.one_more_option',
                                )
                              : strings(
                                  'fiat_on_ramp_aggregator.more_options',
                                  {
                                    count: expandedCount,
                                  },
                                )}
                          </Text>
                        </Row>
                      )}
                    <Row>
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
                  </Fragment>
                ))
              )}
            </ScreenLayout.Content>
          </Animated.ScrollView>
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
}

export default Quotes;
