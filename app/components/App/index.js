import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from 'react-navigation';
import BrowserScreen from '../BrowserScreen';
import WalletScreen from '../WalletScreen';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import fontelloConfig from '../../fonts/config.json';
const Icon = createIconSetFromFontello(fontelloConfig);

import { colors } from '../../styles/common';
/**
 * Root application component responsible for configuring the tab navigator
 */
export default createBottomTabNavigator(
	{
		Home: {
			screen: BrowserScreen,
			navigationOptions: () => ({
				title: 'ÐApps',
				tabBarIcon: ico => <Icon name="dapp" size={18} color={ico.tintColor} /> // eslint-disable-line react/display-name
			})
		},
		Wallet: {
			screen: WalletScreen,
			navigationOptions: () => ({
				title: 'Wallet',
				tabBarIcon: ico => <Icon name="wallet" size={20} color={ico.tintColor} /> // eslint-disable-line react/display-name
			})
		}
	},
	{
		tabBarOptions: {
			activeTintColor: colors.primary,
			inactiveTintColor: colors.inactive,
			style: {
				borderTopWidth: StyleSheet.hairlineWidth
			}
		}
	}
);
