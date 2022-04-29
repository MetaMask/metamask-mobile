import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenLayout from '../components/ScreenLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import LoadingAnimation from '../components/LoadingAnimation';
import Quote from '../components/Quote';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
import useInterval from '../../../hooks/useInterval';
import ScreenView from '../../FiatOrders/components/ScreenView';
import StyledButton from '../../StyledButton';
import Device from '../../../../util/device';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { callbackBaseUrl } from '../orderProcessor/aggregator';
import InfoAlert from '../components/InfoAlert';

import Animated, {
	Extrapolate,
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from 'react-native-reanimated';

const createStyles = (colors) =>
	StyleSheet.create({
		row: {
			marginVertical: 8,
		},
		topBorder: {
			height: 1,
			width: '100%',
			backgroundColor: colors.border.default,
		},
		firstRow: {
			marginTop: 0,
			marginBottom: 8,
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
	});

const LINK = {
	HOMEPAGE: 'Homepage',
	PRIVACY_POLICY: 'Privacy Policy',
	SUPPORT: 'Support',
};

const sortByAmountOut = (a, b) => b.amountOut - a.amountOut;

const GetQuotes = () => {
	const {
		selectedPaymentMethodId,
		selectedRegion,
		selectedAsset,
		selectedAddress,
		selectedFiatCurrencyId,
		appConfig,
	} = useFiatOnRampSDK();

	const { colors } = useTheme();
	const styles = createStyles(colors);

	const { params } = useRoute();
	const navigation = useNavigation();
	const [isLoading, setIsLoading] = useState(true);
	const [shouldFinishAnimation, setShouldFinishAnimation] = useState(false);
	const [firstFetchCompleted, setFirstFetchCompleted] = useState(false);
	const [isInPolling, setIsInPolling] = useState(false);
	const [pollingCyclesLeft, setPollingCyclesLeft] = useState(appConfig.POLLING_CYCLES - 1);
	const [remainingTime, setRemainingTime] = useState(appConfig.POLLING_INTERVAL);
	const [showProviderInfo, setShowProviderInfo] = useState(false);
	const [selectedProviderInfo, setSelectedProviderInfo] = useState(null);
	const [providerId, setProviderId] = useState(null);

	const scrollOffsetY = useSharedValue(0);
	const scrollHandler = useAnimatedScrollHandler((event) => {
		scrollOffsetY.value = event.contentOffset.y;
	});
	const animatedStyles = useAnimatedStyle(() => {
		const value = interpolate(scrollOffsetY.value, [0, 50], [0, 1], Extrapolate.EXTEND);
		return { opacity: value };
	});

	const [{ data: quotes, isFetching: isFetchingQuotes, error: ErrorFetchingQuotes }, fetchQuotes] = useSDKMethod(
		'getQuotes',
		selectedRegion?.id,
		selectedPaymentMethodId,
		selectedAsset?.id,
		selectedFiatCurrencyId,
		params.amount,
		selectedAddress,
		callbackBaseUrl
	);

	const filteredQuotes = useMemo(() => (quotes || []).filter(({ error }) => !error), [quotes]);

	// we only activate this interval polling once the first fetch of quotes is successfull
	useInterval(
		() => {
			setRemainingTime((remainingTime) => {
				const newRemainingTime = Number(remainingTime - 1000);

				if (newRemainingTime <= 0) {
					setPollingCyclesLeft((cycles) => cycles - 1);
					// we never fetch data if we run out of remaining polling cycles
					setShowProviderInfo(false);
					pollingCyclesLeft > 0 && fetchQuotes();
				}

				return newRemainingTime > 0 ? newRemainingTime : appConfig.POLLING_INTERVAL;
			});
		},
		isInPolling ? 1000 : null
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
	}, [ErrorFetchingQuotes, filteredQuotes, firstFetchCompleted, isFetchingQuotes, isInPolling]);

	// The moment we have consumed all of our polling cycles, we need to stop fetching new quotes and clear the interval
	useEffect(() => {
		if (pollingCyclesLeft < 0 || ErrorFetchingQuotes) {
			setIsInPolling(false);
			setShowProviderInfo(false);
		}
	}, [ErrorFetchingQuotes, pollingCyclesLeft]);

	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Get Quotes' }, colors));
	}, [navigation, colors]);

	useEffect(() => {
		if (isFetchingQuotes) return;
		setShouldFinishAnimation(true);
	}, [isFetchingQuotes]);

	const handleOnPress = useCallback((quote) => {
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
		[navigation]
	);

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
							remainingTime <= appConfig.POLLING_INTERVAL_HIGHLIGHT && styles.timerHiglight,
						]}
					>
						{new Date(remainingTime).toISOString().substring(15, 19)}
					</Text>
				</Text>
			)}
		</View>
	);

	if (pollingCyclesLeft < 0) {
		return (
			<ScreenView contentContainerStyle={styles.screen}>
				<View style={[styles.errorContent, styles.errorViewContent]}>
					{<MaterialCommunityIcons name="clock-outline" style={[styles.errorIcon, styles.expiredIcon]} />}
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
						onPress={() => {
							setIsLoading(true);
							setFirstFetchCompleted(false);
							setIsInPolling(true);
							setPollingCyclesLeft(appConfig.POLLING_CYCLES - 1);
							setRemainingTime(appConfig.POLLING_INTERVAL);
							fetchQuotes();
						}}
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
						title="Fetching Quotes"
						finish={shouldFinishAnimation}
						onAnimationEnd={() => setIsLoading(false)}
					/>
				</ScreenLayout.Body>
			</ScreenLayout>
		);
	}

	return (
		<ScreenLayout>
			<ScreenLayout.Header>
				{isInPolling && <QuotesPolling />}
				<Text centered>
					Buy ETH from one of our trusted providers. You’ll be securely taken to their portal without leaving
					the MetaMask app.
				</Text>
			</ScreenLayout.Header>
			<InfoAlert
				isVisible={showProviderInfo}
				dismiss={() => setShowProviderInfo(false)}
				providerName={selectedProviderInfo?.name}
				logos={selectedProviderInfo?.logos}
				subtitle={selectedProviderInfo?.hqAddress}
				body={selectedProviderInfo?.description}
				providerWebsite={selectedProviderInfo?.links?.find((link) => link.name === LINK.HOMEPAGE)?.url}
				providerPrivacyPolicy={
					selectedProviderInfo?.links?.find((link) => link.name === LINK.PRIVACY_POLICY)?.url
				}
				providerSupport={selectedProviderInfo?.links?.find((link) => link.name === LINK.SUPPORT)?.url}
			/>
			<ScreenLayout.Body>
				<Animated.View style={[styles.topBorder, animatedStyles]} />
				<Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
					<ScreenLayout.Content>
						{filteredQuotes.length <= 0 ? (
							<Text black center>
								No providers available!
							</Text>
						) : isFetchingQuotes && isInPolling ? (
							<Text>...</Text> //todo: to be replaced with the skelton screen
						) : (
							filteredQuotes.sort(sortByAmountOut).map((quote) => (
								<View key={quote.provider.id} style={styles.row}>
									<Quote
										quote={quote}
										onPress={() => handleOnPress(quote)}
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

GetQuotes.navigationOptions = () => ({
	title: strings('fiat_on_ramp_aggregator.select_a_quote'),
});

export default GetQuotes;
