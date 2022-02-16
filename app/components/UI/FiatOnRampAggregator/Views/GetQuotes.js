import React from 'react';
import { View } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { useRoute } from '@react-navigation/native';
import Text from '../../../Base/Text';
import { useFiatOnRampSDK, useSDKMethod } from '../SDK';
import { useSelector } from 'react-redux';
import { CHAIN_ID_NETWORKS } from '../constants';
import LoadingAnimation from '../../Swaps/components/LoadingAnimation';
import Box from '../components/Box';

const GetQuotes = () => {
	const { params } = useRoute();

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

	if (isFetchingQuotes) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body>
					<LoadingAnimation
						finish
						// eslint-disable-next-line no-empty-function
						onAnimationEnd={() => {}}
						// eslint-disable-next-line no-empty-function
						aggregatorMetadata={() => {}}
						headPan={false}
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
						<Box key={quote.id}>
							<View>
								<Text>{quote.providerId}</Text>
								<Text>{quote.buyURL}</Text>
							</View>
						</Box>
					))}
				</ScreenLayout.Content>
			</ScreenLayout.Body>
		</ScreenLayout>
	);
};

export default GetQuotes;
