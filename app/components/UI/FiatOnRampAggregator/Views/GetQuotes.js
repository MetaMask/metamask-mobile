import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFiatOnRampSDK, useSDKMethod } from '../SDK';
import { useSelector } from 'react-redux';
import { CHAIN_ID_NETWORKS } from '../constants';
import LoadingAnimation from '../components/LoadingAnimation';
import Quotes from '../components/Quotes';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	row: {
		marginVertical: 8,
	},
});

const GetQuotes = () => {
	const { params } = useRoute();
	const navigation = useNavigation();
	const [isLoading, setIsLoading] = useState(true);
	const [shouldFinishAnimation, setShouldFinishAnimation] = useState(false);
	const [providerId, setProviderId] = useState(null);
	const chainId = useSelector((state) => state.engine.backgroundState.NetworkController.provider.chainId);
	const { selectedPaymentMethod, selectedCountry, selectedRegion, selectedAsset } = useFiatOnRampSDK();

	const [{ data: quotes, isFetching: isFetchingQuotes }] = useSDKMethod(
		'getQuotes',
		{ countryId: selectedCountry, regionId: selectedRegion },
		selectedPaymentMethod,
		selectedAsset,
		CHAIN_ID_NETWORKS[chainId],
		params.amount
	);

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
			<ScreenLayout.Body>
				<ScreenLayout.Content>
					{quotes?.map((quote) => (
						<View key={quote.providerId} style={styles.row}>
							<Quotes
								providerName={quote.providerName}
								amountOut={quote.amountOut}
								crypto={quote.crypto}
								fiat={quote.fiat}
								networkFee={quote.netwrokFee}
								processingFee={quote.providerFee}
								amountIn={quote.amountIn}
								onPress={() => handleOnPress(quote)}
								onPressBuy={() => handleOnPressBuy(quote)}
								highlighted={quote.providerId === providerId}
							/>
						</View>
					))}
				</ScreenLayout.Content>
			</ScreenLayout.Body>
		</ScreenLayout>
	);
};

GetQuotes.navigationOptions = () => ({
	title: strings('fiat_on_ramp_aggregator.select_a_quote'),
});

export default GetQuotes;
