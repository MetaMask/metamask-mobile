import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import PaymentOption from '../components/PaymentOption';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';
import WebviewError from '../../../UI/WebviewError';
import { PAYMENT_METHOD_ICON } from '../constants';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import SkeletonBox from '../components/SkeletonBox';
import SkeletonText from '../components/SkeletonText';
import ListItem from '../../../Base/ListItem';
import Box from '../components/Box';
const styles = StyleSheet.create({
	row: {
		marginVertical: 8,
	},
	boxMargin: {
		marginVertical: 10,
	},
});

const SkeletonPaymentOption = () => (
	<Box style={styles.boxMargin}>
		<ListItem>
			<ListItem.Content>
				<ListItem.Icon>
					<SkeletonBox />
				</ListItem.Icon>
				<ListItem.Body>
					<ListItem.Title>
						<SkeletonText thin title />
					</ListItem.Title>
				</ListItem.Body>
			</ListItem.Content>
		</ListItem>
	</Box>
);

const PaymentMethod = () => {
	const navigation = useNavigation();
	const { colors } = useTheme();

	const { selectedCountry, selectedRegion, selectedPaymentMethod, setSelectedPaymentMethod } = useFiatOnRampSDK();
	const [currentPaymentMethod, setCurrentPaymentMethod] = useState(selectedPaymentMethod);

	const [{ data: paymentMethods, isFetching, error }] = useSDKMethod('getPaymentMethods', {
		countryId: selectedCountry?.id,
		regionId: selectedRegion?.id,
	});

	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Payment Method' }, colors));
	}, [navigation, colors]);

	const handleContinueToAmount = useCallback(() => {
		setSelectedPaymentMethod(currentPaymentMethod);
		navigation.navigate('AmountToBuy');
	}, [currentPaymentMethod, setSelectedPaymentMethod, navigation]);

	if (isFetching) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body>
					<ScreenLayout.Content>
						<SkeletonPaymentOption />
						<SkeletonPaymentOption />
						<SkeletonPaymentOption />
					</ScreenLayout.Content>
				</ScreenLayout.Body>
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
								highlighted={id === currentPaymentMethod}
								title={name}
								time={delay}
								cardImage={['/payments/apple-pay', '/payments/debit-credit-card'].includes(id)}
								onPress={() => setCurrentPaymentMethod(id)}
								amountTier={amountTier}
								paymentType={PAYMENT_METHOD_ICON[id]}
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
							{strings('fiat_on_ramp_aggregator.paymentMethod.continue_to_amount')}
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

export default PaymentMethod;
