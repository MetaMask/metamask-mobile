import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { createSwitchNavigator } from 'react-navigation';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import GlobalAlert from '../GlobalAlert';

import BrowserScreen from '../BrowserScreen';
import WalletScreen from '../WalletScreen';

import fontelloConfig from '../../fonts/config.json';
const CustomIcon = createIconSetFromFontello(fontelloConfig);
import { colors } from '../../styles/common';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	}
});

/**
 * Navigator component that wraps
 * the 2 main sections: Browser, Wallet
 */
const SwitchNavigator = createSwitchNavigator(
	{
		Browser: {
			screen: BrowserScreen,
			defaultNavigationOptions: () => ({
				tabBarTestID: 'browser-tab-button',
				title: strings('bottom_tab_bar.dapps'),
				tabBarIcon: ico => <CustomIcon name="dapp" size={18} color={ico.tintColor} />, // eslint-disable-line react/display-name
				tintColor: colors.primary
			})
		},
		Wallet: {
			screen: WalletScreen,
			defaultNavigationOptions: () => ({
				tabBarTestID: 'wallet-tab-button',
				title: strings('bottom_tab_bar.wallet'),
				tabBarIcon: ico => <CustomIcon name="wallet" size={20} color={ico.tintColor} />, // eslint-disable-line react/display-name
				tintColor: colors.primary
			})
		}
	},
	{
		initialRouteName: 'Browser',
		tabBarOptions: {
			activeTintColor: colors.primary,
			inactiveTintColor: colors.inactive,
			style: {
				borderTopWidth: 0
			}
		}
	}
);

export default class Main extends Component {
	static router = {
		...SwitchNavigator.router
	};
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	render = () => (
		<View style={styles.flex}>
			<SwitchNavigator navigation={this.props.navigation} />
			<GlobalAlert />
		</View>
	);
}
