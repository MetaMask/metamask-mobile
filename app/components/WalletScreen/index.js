import React from 'react';
import PropTypes from 'prop-types';
import Wallet from '../Wallet';
import Settings from '../Settings';
import Asset from '../Asset';
import { createStackNavigator } from 'react-navigation';
import Engine from '../../core/Engine';
const engine = new Engine();

const Nav = createStackNavigator({
	Wallet: {
		screen: Wallet
	},
	Settings: {
		screen: Settings
	},
	Asset: {
		screen: Asset
	}
});

export default class WalletScreen extends React.Component {
	static router = Nav.router;

	static propTypes = {
		navigation: PropTypes.object
	};

	render() {
		return <Nav navigation={this.props.navigation} screenProps={{ engine }} />;
	}
}
