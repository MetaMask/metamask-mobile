import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import LoadingAnimation from '../components/LoadingAnimation';
import Quote from '../components/Quote';
import { strings } from '../../../../../locales/i18n';
import Text from '../../../Base/Text';
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
	});

const GetQuotes = () => {
	const { params } = useRoute();
	const navigation = useNavigation();
	const { colors } = useTheme();
	const styles = createStyles(colors);
	const [isLoading, setIsLoading] = useState(true);
	const [shouldFinishAnimation, setShouldFinishAnimation] = useState(false);

	const scrollOffsetY = useSharedValue(0);
	const scrollHandler = useAnimatedScrollHandler((event) => {
		scrollOffsetY.value = event.contentOffset.y;
	});
	const animatedStyles = useAnimatedStyle(() => {
		const value = interpolate(scrollOffsetY.value, [0, 50], [0, 1], Extrapolate.EXTEND);
		return { opacity: value };
	});

	const [providerId, setProviderId] = useState(null);
	const [showInfo, setShowInfo] = useState(false);
	const [selectedProviderInfo] = useState({});
	const {
		selectedPaymentMethod,
		selectedCountry,
		selectedRegion,
		selectedAsset,
		selectedAddress,
		selectedFiatCurrencyId,
	} = useFiatOnRampSDK();

	const [{ data: quotes, isFetching: isFetchingQuotes }] = useSDKMethod(
		'getQuotes',
		{ countryId: selectedCountry?.id, regionId: selectedRegion?.id },
		selectedPaymentMethod,
		selectedAsset?.id,
		selectedFiatCurrencyId,
		params.amount,
		selectedAddress,
		callbackBaseUrl
	);

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

	const filteredQuotes = useMemo(() => (quotes || []).filter(({ error }) => !error), [quotes]);

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
			<ScreenLayout.Header description="Buy ETH from one of our trusted providers. You’ll be securely taken to their portal without leaving the MetaMask app." />
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
				<Animated.View style={[styles.topBorder, animatedStyles]} />
				<Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
					<ScreenLayout.Content>
						{filteredQuotes.length <= 0 ? (
							<Text black center>
								No providers available!
							</Text>
						) : (
							filteredQuotes.map((quote) => (
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
				</Animated.ScrollView>
			</ScreenLayout.Body>
		</ScreenLayout>
	);
};

GetQuotes.navigationOptions = () => ({
	title: strings('fiat_on_ramp_aggregator.select_a_quote'),
});

export default GetQuotes;
