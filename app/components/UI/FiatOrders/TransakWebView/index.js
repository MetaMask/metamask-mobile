import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { getTransakWebviewNavbar } from '../../../UI/Navbar';
import { baseStyles } from '../../../../styles/common';
import { handleTransakRedirect, TRANSAK_REDIRECT_URL } from '../orderProcessor/transak';

export default class TransakWebView extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransakWebviewNavbar(navigation);

	static propTypes = {
		navigation: PropTypes.object
	};

	handleNavigationStateChange = async navState => {
		if (navState.url.indexOf(TRANSAK_REDIRECT_URL) > -1) {
			handleTransakRedirect(navState.url);
			this.props.navigation.dismiss();
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
