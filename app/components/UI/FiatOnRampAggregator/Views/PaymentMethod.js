import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import PaymentOption from '../components/PaymentOption';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';
import WebviewError from '../../../UI/WebviewError';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { getPaymentMethodIcon } from '../utils';

const styles = StyleSheet.create({
	row: {
		marginVertical: 8,
	},
});

const PaymentMethod = () => {
	const navigation = useNavigation();
	const { colors } = useTheme();

	const { selectedRegion, selectedPaymentMethodId, setSelectedPaymentMethodId } = useFiatOnRampSDK();

	const [{ data: paymentMethods, isFetching, error }] = useSDKMethod('getPaymentMethods', selectedRegion?.id);

	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Payment Method' }, colors));
	}, [navigation, colors]);

	useEffect(() => {
		if (!isFetching && !error && paymentMethods) {
			const paymentMethod = paymentMethods.find((pm) => pm.id === selectedPaymentMethodId);
			if (!paymentMethod) {
				setSelectedPaymentMethodId(paymentMethods?.[0]?.id);
			}
		}
	}, [error, isFetching, paymentMethods, selectedPaymentMethodId, setSelectedPaymentMethodId]);

	const handleContinueToAmount = useCallback(() => {
		navigation.navigate('AmountToBuy');
	}, [navigation]);

	// TODO: replace this with loading screen
	if (isFetching) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body></ScreenLayout.Body>
			</ScreenLayout>
		);
	}

	if (error) {
		return <WebviewError error={{ description: error }} onReload={() => navigation.navigate('PaymentMethod')} />;
	}

	return (
		<ScreenLayout>
			<ScreenLayout.Body>
				<ScreenLayout.Content>
					{paymentMethods?.map(({ id, name, delay, amountTier }) => (
						<View key={id} style={styles.row}>
							<PaymentOption
								highlighted={id === selectedPaymentMethodId}
								title={name}
								time={delay}
								cardImage={['/payments/apple-pay', '/payments/debit-credit-card'].includes(id)}
								onPress={() => setSelectedPaymentMethodId(id)}
								amountTier={amountTier}
								paymentType={getPaymentMethodIcon(id)}
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
							disabled={!selectedPaymentMethodId}
						>
							{strings('fiat_on_ramp_aggregator.paymentMethod.continue_to_amount')}
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

export default PaymentMethod;
