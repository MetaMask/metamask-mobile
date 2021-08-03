import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import { WebView } from 'react-native-webview';
import NotificationManager from '../../../../core/NotificationManager';
import { handleTransakRedirect } from '../orderProcessor/transak';
import AppConstants from '../../../../core/AppConstants';
import { getNotificationDetails } from '..';

import { getTransakWebviewNavbar } from '../../../UI/Navbar';
import { baseStyles } from '../../../../styles/common';
import { protectWalletModalVisible } from '../../../../actions/user';
import { addFiatOrder } from '../../../../reducers/fiatOrders';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { FIAT_ORDER_PROVIDERS, PAYMENT_CATEGORY, PAYMENT_RAILS } from '../utils';

class TransakWebView extends PureComponent {
	static navigationOptions = ({ navigation, route }) =>
		getTransakWebviewNavbar(navigation, route, () => {
			InteractionManager.runAfterInteractions(() => {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_EXITED, {
					payment_rails: PAYMENT_RAILS.MULTIPLE,
					payment_category: PAYMENT_CATEGORY.MULTIPLE,
					'on-ramp_provider': FIAT_ORDER_PROVIDERS.TRANSAK
				});
			});
		});

	static propTypes = {
		navigation: PropTypes.object,
		/**
		 * Currently selected network
		 */
		network: PropTypes.string,
		/**
		 * Function to dispatch adding a new fiat order to the state
		 */
		addOrder: PropTypes.func,
		/**
		 * Prompts protect wallet modal
		 */
		protectWalletModalVisible: PropTypes.func,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object
	};

	handleNavigationStateChange = async navState => {
		if (navState.url.indexOf(AppConstants.FIAT_ORDERS.TRANSAK_REDIRECT_URL) > -1) {
			const order = handleTransakRedirect(navState.url, this.props.network);
			this.props.addOrder(order);
			this.props.protectWalletModalVisible();
			this.props.navigation.dangerouslyGetParent()?.pop();
			InteractionManager.runAfterInteractions(() => {
				AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_SUBMITTED, {
					fiat_amount: order.amount,
					fiat_currency: order.currency,
					crypto_currency: order.cryptocurrency,
					crypto_amount: order.cryptoAmount,
					fee_in_fiat: order.fee,
					fee_in_crypto: order.cryptoFee,
					// fiat_amount_in_usd: '',
					order_id: order.id,
					'on-ramp_provider': FIAT_ORDER_PROVIDERS.TRANSAK
				});
				NotificationManager.showSimpleNotification(getNotificationDetails(order));
			});
		}
	};

	render() {
		const uri = this.props.route.params?.url;
		if (uri) {
			return (
				<View style={baseStyles.flexGrow}>
					<WebView source={{ uri }} onNavigationStateChange={this.handleNavigationStateChange} />
				</View>
			);
		}
	}
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController.network
});

const mapDispatchToProps = dispatch => ({
	addOrder: order => dispatch(addFiatOrder(order)),
	protectWalletModalVisible: () => dispatch(protectWalletModalVisible())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransakWebView);
