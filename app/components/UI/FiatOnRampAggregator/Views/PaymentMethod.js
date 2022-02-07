import React from 'react';
import PropTypes from 'prop-types';
import ScreenView from '../../FiatOrders/components/ScreenView';
import WyreApplePayPaymentMethod from '../../FiatOrders/PaymentMethodSelector/wyreApplePay';
import { strings } from '../../../../../locales/i18n';

const PaymentMethod = ({ navigation }) => (
	<ScreenView>
		<WyreApplePayPaymentMethod onPress={() => navigation.navigate('AmountToBuy')} />
		<WyreApplePayPaymentMethod />
		<WyreApplePayPaymentMethod />
	</ScreenView>
);

PaymentMethod.navigationOptions = ({ navigation, route }) => ({
	title: strings('fiat_on_ramp_aggregator.payment_method'),
});

PaymentMethod.propTypes = {
	navigation: PropTypes.object,
};

export default PaymentMethod;
