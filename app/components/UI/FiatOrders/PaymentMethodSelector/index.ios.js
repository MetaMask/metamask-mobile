import React, { useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NavigationContext } from 'react-navigation';
import { connect } from 'react-redux';

import { useTransakFlowURL } from '../orderProcessor/transak';
import { WYRE_IS_PROMOTION } from '../orderProcessor/wyreApplePay';
import { getPaymentSelectorMethodNavbar } from '../../Navbar';

import ScreenView from '../components/ScreenView';
import Heading from '../components/Heading';

import Text from '../../../Base/Text';
import Title from '../components/Title';
import SubHeader from '../components/SubHeader';

import TransakPaymentMethod from './transak';
import WyreApplePayPaymentMethod from './wyreApplePay';

function PaymentMethodSelectorView({ selectedAddress, ...props }) {
	const navigation = useContext(NavigationContext);
	const transakURL = useTransakFlowURL(selectedAddress);

	const onPressWyreApplePay = useCallback(() => navigation.navigate('PaymentMethodApplePay'), [navigation]);
	const onPressTransak = useCallback(() => {
		navigation.navigate('TransakFlow', {
			url: transakURL,
			title: 'Transak'
		});
	}, [navigation, transakURL]);

	return (
		<ScreenView>
			<Heading>
				<Title centered hero>
					{WYRE_IS_PROMOTION ? (
						<>
							<Text reset>0% fee when you use</Text>
							{'\n'}
							<Text reset>Apple Pay.</Text>
						</>
					) : (
						<>
							<Text reset>How do you want to make</Text>
							{'\n'}
							<Text reset>your purchase?</Text>
						</>
					)}
				</Title>
				{WYRE_IS_PROMOTION && <SubHeader centered>Valid until July 1st, 2020</SubHeader>}
			</Heading>

			<WyreApplePayPaymentMethod onPress={onPressWyreApplePay} />
			<TransakPaymentMethod onPress={onPressTransak} />
		</ScreenView>
	);
}

PaymentMethodSelectorView.propTypes = {
	selectedAddress: PropTypes.string.isRequired
};

PaymentMethodSelectorView.navigationOptions = ({ navigation }) => getPaymentSelectorMethodNavbar(navigation);

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(PaymentMethodSelectorView);
