import React, { useContext, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { NavigationContext } from 'react-navigation';
import { connect } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';

import { useTransakFlowURL } from '../orderProcessor/transak';
import { getPaymentSelectorMethodNavbar } from '../../Navbar';
import ScreenView from '../components/ScreenView';
import Title from '../components/Title';

import TransakPaymentMethod from './transak';

function PaymentMethodSelectorView({ selectedAddress, ...props }) {
	const navigation = useContext(NavigationContext);
	const transakURL = useTransakFlowURL(selectedAddress);

	const onPressTransak = useCallback(() => {
		navigation.navigate('TransakFlow', {
			url: transakURL,
			title: strings('fiat_on_ramp.transak_webview_title')
		});
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_DEBIT_OR_ACH);
		});
	}, [navigation, transakURL]);

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
