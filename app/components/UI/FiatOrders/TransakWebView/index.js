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

class TransakWebView extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransakWebviewNavbar(navigation);

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
		protectWalletModalVisible: PropTypes.func
	};

	handleNavigationStateChange = async navState => {
		if (navState.url.indexOf(AppConstants.FIAT_ORDERS.TRANSAK_REDIRECT_URL) > -1) {
			const order = handleTransakRedirect(navState.url, this.props.network);
			this.props.addOrder(order);
			this.props.protectWalletModalVisible();
			this.props.navigation.dismiss();
			InteractionManager.runAfterInteractions(() =>
				NotificationManager.showSimpleNotification(getNotificationDetails(order))
			);
		}
	};

	render() {
		const uri = this.props.navigation.getParam('url', null);
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
	addOrder: order => dispatch({ type: 'FIAT_ADD_ORDER', payload: order }),
	protectWalletModalVisible: () => dispatch(protectWalletModalVisible())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransakWebView);
