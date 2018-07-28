import React from 'react';
import { createBottomTabNavigator } from 'react-navigation';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import BrowserScreen from '../BrowserScreen';
import WalletScreen from '../WalletScreen';
import SettingsScreen from '../SettingsScreen';

import fontelloConfig from '../../fonts/config.json';
const CustomIcon = createIconSetFromFontello(fontelloConfig);
import { colors } from '../../styles/common';

export default createBottomTabNavigator(
	{
		Home: {
			screen: BrowserScreen,
			navigationOptions: () => ({
				title: 'ÐApps',
				tabBarIcon: ico => <CustomIcon name="dapp" size={18} color={ico.tintColor} /> // eslint-disable-line react/display-name
			})
		},
		Wallet: {
			screen: WalletScreen,
			navigationOptions: () => ({
				title: 'Wallet',
				tabBarIcon: ico => <CustomIcon name="wallet" size={20} color={ico.tintColor} /> // eslint-disable-line react/display-name
			})
		},
		Settings: {
			screen: SettingsScreen,
			navigationOptions: () => ({
				title: 'Settings',
				tabBarIcon: ico => <Icon name="settings" size={20} color={ico.tintColor} /> // eslint-disable-line react/display-name
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
