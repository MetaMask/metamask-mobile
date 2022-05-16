import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { QuoteResponse, Provider } from '@consensys/on-ramp-sdk';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import ScreenLayout from '../components/ScreenLayout';
import ScreenView from '../../FiatOrders/components/ScreenView';
import LoadingAnimation from '../components/LoadingAnimation';
import Quote from '../components/Quote';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import InfoAlert from '../components/InfoAlert';
import SkeletonText from '../components/SkeletonText';
import Box from '../components/Box';
import BaseText from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import BaseListItem from '../../../Base/ListItem';
import { getFiatOnRampAggNavbar } from '../../Navbar';

import { callbackBaseUrl } from '../orderProcessor/aggregator';
import useInterval from '../../../hooks/useInterval';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/device';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import { PROVIDER_LINKS } from '../types';

// TODO: Convert into typescript and correctly type
const Text = BaseText as any;
const ListItem = BaseListItem as any;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      marginVertical: 8,
    },
    topBorder: {
      height: 1,
      width: '100%',
      backgroundColor: colors.border.default,
    },
    timerWrapper: {
      backgroundColor: colors.background.alternative,
      borderRadius: 20,
      marginVertical: 12,
      paddingVertical: 4,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    timer: {
      fontVariant: ['tabular-nums'],
    },
    timerHiglight: {
      color: colors.error.default,
    },
    errorContent: {
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    errorViewContent: {
      flex: 1,
      marginHorizontal: Device.isSmallDevice() ? 20 : 55,
      justifyContent: 'center',
    },
    errorTitle: {
      fontSize: 24,
      marginVertical: 10,
    },
    errorText: {
      fontSize: 14,
    },
    errorIcon: {
      fontSize: 46,
      marginVertical: 4,
      color: colors.error.default,
    },
    expiredIcon: {
      color: colors.primary.default,
    },
    screen: {
      flexGrow: 1,
      justifyContent: 'space-between',
    },
    bottomSection: {
      marginBottom: 6,
      alignItems: 'stretch',
      paddingHorizontal: 20,
    },
    ctaButton: {
      marginBottom: 30,
    },
    withoutTopPadding: {
      paddingTop: 0,
    },
    withoutTopMargin: {
      marginTop: 0,
    },
    withoutVerticalPadding: {
      paddingVertical: 0,
    },
  });

const SkeletonQuote = ({
  collapsed,
  style,
}: {
  collapsed?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Box style={[styles.row, style]}>
      <ListItem.Content>
        <ListItem.Body>
          <ListItem.Title>
            <SkeletonText title />
          </ListItem.Title>
        </ListItem.Body>
        <ListItem.Amounts>
          <SkeletonText medium />
        </ListItem.Amounts>
      </ListItem.Content>
      {!collapsed && (
        <>
          <ListItem.Content>
            <ListItem.Body>
              <SkeletonText thin />
            </ListItem.Body>
            <ListItem.Amounts>
              <SkeletonText thin spacingVertical small />
            </ListItem.Amounts>
          </ListItem.Content>
          <ListItem.Content>
            <ListItem.Body>
              <SkeletonText thin />
            </ListItem.Body>
            <ListItem.Amounts>
              <SkeletonText thin small />
            </ListItem.Amounts>
          </ListItem.Content>
          <ListItem.Content>
            <ListItem.Body>
              <SkeletonText thin />
            </ListItem.Body>
            <ListItem.Amounts>
              <SkeletonText thin spacingVertical small />
            </ListItem.Amounts>
          </ListItem.Content>
        </>
      )}
    </Box>
  );
};

const sortByAmountOut = (a: QuoteResponse, b: QuoteResponse) => {
  if (a.amountOut && b.amountOut) {
    return b.amountOut - a.amountOut;
  }
  return 0;
};

const GetQuotes = () => {
  const {
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedAddress,
    selectedFiatCurrencyId,
    appConfig,
    sdkError,
  } = useFiatOnRampSDK();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { params } = useRoute();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldFinishAnimation, setShouldFinishAnimation] = useState(false);
  const [firstFetchCompleted, setFirstFetchCompleted] = useState(false);
  const [isInPolling, setIsInPolling] = useState(false);
  const [pollingCyclesLeft, setPollingCyclesLeft] = useState(
    appConfig.POLLING_CYCLES - 1,
  );
  const [remainingTime, setRemainingTime] = useState(
    appConfig.POLLING_INTERVAL,
  );
  const [showProviderInfo, setShowProviderInfo] = useState(false);
  const [selectedProviderInfo, setSelectedProviderInfo] =
    useState<Provider | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

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

  const [
    { data: quotes, isFetching: isFetchingQuotes, error: ErrorFetchingQuotes },
    fetchQuotes,
  ] = useSDKMethod(
    'getQuotes',
    selectedRegion?.id,
    selectedPaymentMethodId,
    selectedAsset?.id,
    selectedFiatCurrencyId,
    // @ts-expect-error useRoute params
    params?.amount,
    selectedAddress,
    callbackBaseUrl,
  );

  const filteredQuotes = useMemo(
    () => (quotes || []).filter(({ error }) => !error).sort(sortByAmountOut),
    [quotes],
  );

  // we only activate this interval polling once the first fetch of quotes is successfull
  useInterval(
    () => {
      setRemainingTime((prevRemainingTime) => {
        const newRemainingTime = Number(prevRemainingTime - 1000);

        if (newRemainingTime <= 0) {
          setPollingCyclesLeft((cycles) => cycles - 1);
          // we never fetch data if we run out of remaining polling cycles
          setShowProviderInfo(false);
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
    isInPolling ? 1000 : null,
  );

  // Listen to the event of first fetch completed
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

  // The moment we have consumed all of our polling cycles, we need to stop fetching new quotes and clear the interval
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
        colors,
      ),
    );
  }, [navigation, colors]);

  useEffect(() => {
    if (isFetchingQuotes) return;
    setShouldFinishAnimation(true);
  }, [isFetchingQuotes]);

  useEffect(() => {
    if (filteredQuotes && filteredQuotes.length > 0) {
      setProviderId(filteredQuotes[0].provider?.id);
    }
  }, [filteredQuotes]);

  const handleOnQuotePress = useCallback((quote) => {
    setProviderId(quote.provider.id);
  }, []);

  const handleInfoPress = useCallback((quote) => {
    if (quote?.provider) {
      setSelectedProviderInfo(quote.provider);
      setShowProviderInfo(true);
    }
  }, []);

  const handleOnPressBuy = useCallback(
    (quote) => {
      quote?.provider?.id && navigation.navigate('Checkout', { ...quote });
    },
    [navigation],
  );

  const handleFetchQuotes = useCallback(() => {
    setIsLoading(true);
    setFirstFetchCompleted(false);
    setIsInPolling(true);
    setPollingCyclesLeft(appConfig.POLLING_CYCLES - 1);
    setRemainingTime(appConfig.POLLING_INTERVAL);
    fetchQuotes();
  }, [appConfig.POLLING_CYCLES, appConfig.POLLING_INTERVAL, fetchQuotes]);

  const QuotesPolling = () => (
    <View style={styles.timerWrapper}>
      {isFetchingQuotes ? (
        <>
          <ActivityIndicator size="small" />
          <Text> {strings('fiat_on_ramp_aggregator.fetching_new_quotes')}</Text>
        </>
      ) : (
        <Text primary centered>
          {pollingCyclesLeft > 0
            ? strings('fiat_on_ramp_aggregator.new_quotes_in')
            : strings('fiat_on_ramp_aggregator.quotes_expire_in')}{' '}
          <Text
            bold
            primary
            style={[
              styles.timer,
              remainingTime <= appConfig.POLLING_INTERVAL_HIGHLIGHT &&
                styles.timerHiglight,
            ]}
          >
            {new Date(remainingTime).toISOString().substring(15, 19)}
          </Text>
        </Text>
      )}
    </View>
  );

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  // Error while FetchingQuotes
  if (ErrorFetchingQuotes) {
    return (
      <ErrorView
        description={ErrorFetchingQuotes}
        ctaOnPress={handleFetchQuotes}
      />
    );
  }

  if (pollingCyclesLeft < 0) {
    return (
      <ScreenView contentContainerStyle={styles.screen}>
        <View style={[styles.errorContent, styles.errorViewContent]}>
          {
            <MaterialCommunityIcons
              name="clock-outline"
              style={[styles.errorIcon, styles.expiredIcon]}
            />
          }
          <Text primary centered style={styles.errorTitle}>
            {strings('fiat_on_ramp_aggregator.quotes_timeout')}
          </Text>
          <Text centered style={styles.errorText}>
            {strings('fiat_on_ramp_aggregator.request_new_quotes')}
          </Text>
        </View>
        <View style={styles.bottomSection}>
          <StyledButton
            type="blue"
            containerStyle={styles.ctaButton}
            onPress={handleFetchQuotes}
          >
            {strings('fiat_on_ramp_aggregator.get_new_quotes')}
          </StyledButton>
        </View>
      </ScreenView>
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
          'fiat_on_ramp_aggregator.try_different_amount_to_buy_input',
        )}
        ctaOnPress={() => navigation.goBack()}
      />
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Header>
        {isInPolling && <QuotesPolling />}
        <ScreenLayout.Content style={styles.withoutVerticalPadding}>
          <Text centered grey>
            {strings('fiat_on_ramp_aggregator.buy_from_vetted', {
              // @ts-expect-error params useRute type
              ticker: params?.asset?.symbol || '',
            })}
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
              <>
                <SkeletonQuote style={styles.withoutTopMargin} />
                <SkeletonQuote collapsed />
                <SkeletonQuote collapsed />
              </>
            ) : (
              filteredQuotes.map((quote, index) => (
                <View
                  key={quote.provider.id}
                  style={[styles.row, index === 0 && styles.withoutTopMargin]}
                >
                  <Quote
                    quote={quote}
                    onPress={() => handleOnQuotePress(quote)}
                    onPressBuy={() => handleOnPressBuy(quote)}
                    highlighted={quote.provider.id === providerId}
                    showInfo={() => handleInfoPress(quote)}
                  />
                </View>
              ))
            )}
          </ScreenLayout.Content>
        </Animated.ScrollView>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
};

export default GetQuotes;
