import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { WebView } from 'react-native';
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
		return <WebView source={{ uri }} />;
	}
}
