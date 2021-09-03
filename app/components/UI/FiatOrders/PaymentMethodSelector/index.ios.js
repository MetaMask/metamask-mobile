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
import { WYRE_IS_PROMOTION } from '../orderProcessor/wyreApplePay';
import { getPaymentSelectorMethodNavbar } from '../../Navbar';

import ScreenView from '../components/ScreenView';
import Heading from '../components/Heading';

import Text from '../../../Base/Text';
import Title from '../components/Title';
import SubHeader from '../components/SubHeader';

import TransakPaymentMethod from './transak';
import WyreApplePayPaymentMethod from './wyreApplePay';
import { setGasEducationCarouselSeen } from '../../../../actions/user';

function PaymentMethodSelectorView({
	selectedAddress,
	network,
	gasEducationCarouselSeen,
	setGasEducationCarouselSeen,
	...props
}) {
	const navigation = useNavigation();
	const transakURL = useTransakFlowURL(selectedAddress);

	const onPressWyreApplePay = useCallback(() => {
		const goToApplePay = () => navigation.navigate('PaymentMethodApplePay');
		if (!gasEducationCarouselSeen) {
			navigation.navigate('GasEducationCarousel', {
				navigateTo: goToApplePay,
			});
			setGasEducationCarouselSeen();
		} else {
			goToApplePay();
		}

		InteractionManager.runAfterInteractions(() => {
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_STARTED, {
				payment_rails: PAYMENT_RAILS.APPLE_PAY,
				payment_category: PAYMENT_CATEGORY.CARD_PAYMENT,
				'on-ramp_provider': FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY,
			});
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_APPLE_PAY);
		});
	}, [navigation, gasEducationCarouselSeen, setGasEducationCarouselSeen]);

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
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_STARTED, {
				payment_rails: PAYMENT_RAILS.MULTIPLE,
				payment_category: PAYMENT_CATEGORY.MULTIPLE,
				'on-ramp_provider': FIAT_ORDER_PROVIDERS.TRANSAK,
			});
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_DEBIT_OR_ACH);
		});
	}, [navigation, transakURL, gasEducationCarouselSeen, setGasEducationCarouselSeen]);

	return (
		<ScreenView>
			<Heading>
				<Title centered hero>
					{WYRE_IS_PROMOTION ? (
						<>
							<Text reset>{strings('fiat_on_ramp.purchase_method_title.wyre_first_line')}</Text>
							{'\n'}
							<Text reset>{strings('fiat_on_ramp.purchase_method_title.wyre_second_line')}</Text>
						</>
					) : (
						<>
							<Text reset>{strings('fiat_on_ramp.purchase_method_title.first_line')}</Text>
							{'\n'}
							<Text reset>{strings('fiat_on_ramp.purchase_method_title.second_line')}</Text>
						</>
					)}
				</Title>
				{WYRE_IS_PROMOTION && (
					<SubHeader centered>{strings('fiat_on_ramp.purchase_method_title.wyre_sub_header')}</SubHeader>
				)}
			</Heading>

			<WyreApplePayPaymentMethod onPress={onPressWyreApplePay} />
			{network === '1' && <TransakPaymentMethod onPress={onPressTransak} />}
		</ScreenView>
	);
}

PaymentMethodSelectorView.propTypes = {
	selectedAddress: PropTypes.string.isRequired,
	network: PropTypes.string.isRequired,
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
	network: state.engine.backgroundState.NetworkController.network,
	gasEducationCarouselSeen: state.user.gasEducationCarouselSeen,
});

const mapDispatchToProps = (dispatch) => ({
	setGasEducationCarouselSeen: () => dispatch(setGasEducationCarouselSeen()),
});

export default connect(mapStateToProps, mapDispatchToProps)(PaymentMethodSelectorView);
