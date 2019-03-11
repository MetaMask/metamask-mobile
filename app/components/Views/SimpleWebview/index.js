import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Web3Webview from 'react-native-web3-webview';
import { getWebviewNavbar } from '../../UI/Navbar';

export default class SimpleWebview extends Component {
	static navigationOptions = ({ navigation }) => getWebviewNavbar(navigation);

	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object
	};

	render() {
		const uri = this.props.navigation.getParam('url', 'about:blank');
		return <Web3Webview source={{ uri }} />;
	}
}
