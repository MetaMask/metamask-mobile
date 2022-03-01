import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import PaymentOption, { Icon } from '../components/PaymentOption';
import { useFiatOnRampSDK, useSDKMethod } from '../SDK';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';

const styles = StyleSheet.create({
	row: {
		marginVertical: 8,
	},
});

const PaymentMethod = () => {
	const navigation = useNavigation();
	const [currentPaymentMethod, setCurrentPaymentMethod] = useState(null);

	const { selectedCountry, selectedRegion, setSelectedPaymentMethod } = useFiatOnRampSDK();
	const [{ data: paymentMethods, isFetching, error }] = useSDKMethod('getPaymentMethods', {
		countryId: selectedCountry,
		regionId: selectedRegion,
	});

	const handleContinueToAmount = useCallback(() => {
		setSelectedPaymentMethod(currentPaymentMethod);
		navigation.navigate('AmountToBuy');
	}, [currentPaymentMethod, setSelectedPaymentMethod, navigation]);

	if (isFetching || !paymentMethods) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body>
					<Text>Loading...</Text>
				</ScreenLayout.Body>
			</ScreenLayout>
		);
	}
	if (error) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body>
					<Text>{error}</Text>
				</ScreenLayout.Body>
			</ScreenLayout>
		);
	}

	return (
		<ScreenLayout>
			<ScreenLayout.Body>
				<ScreenLayout.Content>
					{paymentMethods?.map(({ id, name, delay }) => (
						<View key={id} style={styles.row}>
							<PaymentOption
								highlighted={id === currentPaymentMethod}
								title={name}
								time={delay}
								cardImage={['/payments/apple-pay', '/payments/debit-credit-card'].includes(id)}
								onPress={() => setCurrentPaymentMethod(id)}
								lowestLimit
								paymentType={Icon.Apple}
								idRequired={false}
							/>
						</View>
					))}
				</ScreenLayout.Content>
			</ScreenLayout.Body>
			<ScreenLayout.Footer>
				<ScreenLayout.Content>
					<View style={styles.row}>
						<Text small grey centered>
							Apple cash lorem ipsum sed ut perspiciatis unde omnis iste natus error sit voluptatem sed ut
							perspiciatis
						</Text>
					</View>
					<View style={styles.row}>
						<StyledButton
							type={'confirm'}
							onPress={handleContinueToAmount}
							disabled={!currentPaymentMethod}
						>
							Continue to amount
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

PaymentMethod.navigationOptions = ({ navigation, route }) => ({
	title: strings('fiat_on_ramp_aggregator.payment_method'),
});

export default PaymentMethod;
