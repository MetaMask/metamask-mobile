import React, { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';
import { connect } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Analytics from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { FIAT_ORDER_PROVIDERS, PAYMENT_CATEGORY, PAYMENT_RAILS } from '../../../../constants/on-ramp';

import { useTransakFlowURL } from '../orderProcessor/transak';
import { getPaymentSelectorMethodNavbar } from '../../Navbar';
import ScreenView from '../components/ScreenView';
import Title from '../components/Title';

import TransakPaymentMethod from './transak';

import { setGasEducationCarouselSeen } from '../../../../actions/user';

function PaymentMethodSelectorView({
	selectedAddress,
	gasEducationCarouselSeen,
	setGasEducationCarouselSeen,
	...props
}) {
	const navigation = useNavigation();
	const transakURL = useTransakFlowURL(selectedAddress);

	const onPressTransak = useCallback(() => {
		const goToTransakFlow = () =>
			navigation.navigate('TransakFlow', {
				url: transakURL,
				title: strings('fiat_on_ramp.transak_webview_title'),
			});

		if (!gasEducationCarouselSeen) {
			navigation.navigate('GasEducationCarousel', {
				navigateTo: goToTransakFlow,
			});
			setGasEducationCarouselSeen();
		} else {
			goToTransakFlow();
		}

		InteractionManager.runAfterInteractions(() => {
			InteractionManager.runAfterInteractions(() => {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_STARTED, {
					payment_rails: PAYMENT_RAILS.MULTIPLE,
					payment_category: PAYMENT_CATEGORY.MULTIPLE,
					'on-ramp_provider': FIAT_ORDER_PROVIDERS.TRANSAK,
				});
			});
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_DEBIT_OR_ACH);
		});
	}, [navigation, transakURL, gasEducationCarouselSeen, setGasEducationCarouselSeen]);

	return (
		<ScreenView>
			<Title />
			<TransakPaymentMethod onPress={onPressTransak} />
		</ScreenView>
	);
}

PaymentMethodSelectorView.propTypes = {
	selectedAddress: PropTypes.string.isRequired,
	gasEducationCarouselSeen: PropTypes.bool,
	setGasEducationCarouselSeen: PropTypes.func,
};

PaymentMethodSelectorView.navigationOptions = ({ navigation }) =>
	getPaymentSelectorMethodNavbar(navigation, () => {
		InteractionManager.runAfterInteractions(() => {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_CLOSED);
		});
	});

const mapStateToProps = (state) => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	gasEducationCarouselSeen: state.user.gasEducationCarouselSeen,
});

const mapDispatchToProps = (dispatch) => ({
	setGasEducationCarouselSeen: () => dispatch(setGasEducationCarouselSeen()),
});

export default connect(mapStateToProps, mapDispatchToProps)(PaymentMethodSelectorView);
