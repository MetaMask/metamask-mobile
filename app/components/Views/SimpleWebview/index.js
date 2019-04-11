import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Web3Webview from 'react-native-web3-webview';
import { getWebviewNavbar } from '../../UI/Navbar';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Logger from '../../../util/Logger';

export default class SimpleWebview extends Component {
	static navigationOptions = ({ navigation }) => getWebviewNavbar(navigation);

	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ dispatch: this.share });
	};

	share = () => {
		const { navigation } = this.props;
		const uri = navigation && navigation.getParam('url', 'about:blank');
		Share.open({
			url: uri
		}).catch(err => {
			Logger.log('Error while trying to share simple web view', err);
		});
	};

	render() {
		const uri = this.props.navigation.getParam('url', 'about:blank');
		return <Web3Webview source={{ uri }} />;
	}
}
