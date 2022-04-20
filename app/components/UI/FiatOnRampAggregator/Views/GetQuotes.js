import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenLayout from '../components/ScreenLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import LoadingAnimation from '../components/LoadingAnimation';
import Quote from '../components/Quote';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import { colors } from '../../../../styles/common';
import useInterval from '../../../hooks/useInterval';
import ScreenView from '../../FiatOrders/components/ScreenView';
import StyledButton from '../../StyledButton';
import Device from '../../../../util/device';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { callbackBaseUrl } from '../orderProcessor/aggregator';
import InfoAlert from '../components/InfoAlert';

const styles = StyleSheet.create({
	row: {
		marginVertical: 8,
	},
	firstRow: {
		marginTop: 0,
		marginBottom: 8,
	},
	timerWrapper: {
		backgroundColor: colors.grey000,
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
		color: colors.red,
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
		color: colors.red,
	},
	expiredIcon: {
		color: colors.blue,
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
});

const GetQuotes = () => {
	const {
		selectedPaymentMethod,
		selectedCountry,
		selectedRegion,
		selectedAsset,
		selectedAddress,
		selectedFiatCurrencyId,
		appConfig,
	} = useFiatOnRampSDK();

	const { params } = useRoute();
	const navigation = useNavigation();
	const { colors } = useTheme();
	const [isLoading, setIsLoading] = useState(true);
	const [shouldFinishAnimation, setShouldFinishAnimation] = useState(false);
	const [firstFetchCompleted, setFirstFetchCompleted] = useState(false);
	const [isInPolling, setIsInPolling] = useState(true);
	const [pollingCyclesLeft, setPollingCyclesLeft] = useState(appConfig.POLLING_CYCLES - 1);
	const [remainingTime, setRemainingTime] = useState(appConfig.POLLING_INTERVAL);
	const [showInfo, setShowInfo] = useState(false);
	const [selectedProviderInfo] = useState({});
	const [providerId, setProviderId] = useState(null);

	const [{ data: quotes, isFetching: isFetchingQuotes, error: ErrorFetchingQuotes }, fetchQuotes] = useSDKMethod(
		'getQuotes',
		{ countryId: selectedCountry?.id, regionId: selectedRegion?.id },
		selectedPaymentMethod,
		selectedAsset?.id,
		selectedFiatCurrencyId,
		params.amount,
		selectedAddress,
		callbackBaseUrl
	);

	// we only activate this interval polling once the first fetch of quotes is successfull
	useInterval(
		() => {
			setRemainingTime((remainingTime) => {
				const newRemainingTime = Number(remainingTime - 1000);

				if (newRemainingTime <= 0) {
					setPollingCyclesLeft((cycles) => cycles - 1);
					// we never fetch data if we run out of remaining polling cycles
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
			quotes &&
			quotes.length
		) {
			setFirstFetchCompleted(true);
			setIsInPolling(true);
		}
	}, [ErrorFetchingQuotes, firstFetchCompleted, isFetchingQuotes, isInPolling, quotes]);

	// The moment we have consumed all of our polling cycles, we need to stop fetching new quotes and clear the interval
	useEffect(() => {
		if (pollingCyclesLeft < 0 || ErrorFetchingQuotes) {
			setIsInPolling(false);
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
		setProviderId(quote.providerId);
	}, []);

	const handleOnPressBuy = useCallback(
		(quote) => {
			quote?.providerId && navigation.navigate('Checkout', { ...quote });
		},
		[navigation]
	);

	const QuotesPolling = () => (
		<TouchableOpacity style={[styles.timerWrapper]}>
			{isFetchingQuotes ? (
				<>
					<ActivityIndicator size="small" />
					<Text> {strings('fiat_on_ramp_aggregator.fetching_new_quotes')}</Text>
				</>
			) : (
				<Text primary>
					{pollingCyclesLeft > 0
						? strings('fiat_on_ramp_aggregator.new_quotes_in')
						: strings('fiat_on_ramp_aggregator.quotes_expire_in')}{' '}
					<Text
						bold
						primary
						style={[
							styles.timer,
							remainingTime < appConfig.POLLING_INTERVAL_HIGHLIGHT && styles.timerHiglight,
						]}
					>
						{new Date(remainingTime).toISOString().substr(15, 4)}
					</Text>
				</Text>
			)}
		</TouchableOpacity>
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
			<ScreenLayout.Header
				title={() => (isInPolling ? <QuotesPolling /> : undefined)}
				description="Buy ETH from one of our trusted providers. You’ll be securely taken to their portal without leaving the MetaMask app."
			/>
			<InfoAlert
				isVisible={showInfo}
				subtitle={selectedProviderInfo.subtitle}
				dismiss={() => setShowInfo(false)}
				providerName={selectedProviderInfo.name}
				body={selectedProviderInfo.body}
				providerWebsite={selectedProviderInfo.website}
				providerPrivacyPolicy={selectedProviderInfo.privacyPolicy}
				providerSupport={selectedProviderInfo.support}
			/>
			<ScreenLayout.Body>
				<ScrollView>
					<ScreenLayout.Content>
						{quotes.length <= 0 ? (
							<Text black center>
								No providers available!
							</Text>
						) : isFetchingQuotes && isInPolling ? (
							<Text>...</Text> //todo: to be replaced with the skelton screen
						) : (
							quotes
								.filter(({ error, errorCode }) => !error && !errorCode)
								.map((quote) => (
									<View key={quote.providerId} style={styles.row}>
										<Quote
											quote={quote}
											onPress={() => handleOnPress(quote)}
											onPressBuy={() => handleOnPressBuy(quote)}
											highlighted={quote.providerId === providerId}
											showInfo={() => setShowInfo(true)}
										/>
									</View>
								))
						)}
					</ScreenLayout.Content>
				</ScrollView>
			</ScreenLayout.Body>
		</ScreenLayout>
	);
};

GetQuotes.navigationOptions = () => ({
	title: strings('fiat_on_ramp_aggregator.select_a_quote'),
});

export default GetQuotes;
