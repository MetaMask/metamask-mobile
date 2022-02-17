import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { useRoute } from '@react-navigation/native';
import { useFiatOnRampSDK, useSDKMethod } from '../SDK';
import { useSelector } from 'react-redux';
import { CHAIN_ID_NETWORKS } from '../constants';
import LoadingAnimation from '../components/LoadingAnimation';
import Quotes from '../components/Quotes';

const styles = StyleSheet.create({
	row: {
		marginVertical: 8,
	},
});

const GetQuotes = () => {
	const { params } = useRoute();
	const [isLoading, setIsLoading] = useState(true);
	const [shouldFinishAnimation, setShouldFinishAnimation] = useState(false);
	const [currentQuote, setCurrentQuote] = useState(null);
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
		console.log(quotes);
		if (isFetchingQuotes) return;
		setShouldFinishAnimation(true);
	}, [isFetchingQuotes]);

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
								onPress={() => setCurrentQuote(quote.providerId)}
								highlighted={quote.providerId === currentQuote}
							></Quotes>
						</View>
					))}
				</ScreenLayout.Content>
			</ScreenLayout.Body>
		</ScreenLayout>
	);
};

export default GetQuotes;
