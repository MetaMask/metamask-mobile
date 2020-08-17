import React, { useCallback } from 'react';
import { InteractionManager, Linking } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';

import { useTransakFlowURL } from '../orderProcessor/transak';
import { getPaymentSelectorMethodNavbar } from '../../Navbar';
import ScreenView from '../components/ScreenView';
import Title from '../components/Title';

import TransakPaymentMethod from './transak';
import Logger from '../../../../util/Logger';

function PaymentMethodSelectorView({ selectedAddress, ...props }) {
	const transakURL = useTransakFlowURL(selectedAddress);

	const onPressTransak = useCallback(() => {
		Linking.openURL(transakURL).catch(e => Logger.console.error('PaymentMethodSelectorView::onPressTransak', e));

		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_DEBIT_OR_ACH);
		});
	}, [transakURL]);

	return (
		<ScreenView>
			<Title />
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
