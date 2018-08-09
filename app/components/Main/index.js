import React from 'react';
import { createBottomTabNavigator } from 'react-navigation';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import BrowserScreen from '../BrowserScreen';
import WalletScreen from '../WalletScreen';
import TransferScreen from '../TransferScreen';

import fontelloConfig from '../../fonts/config.json';
const CustomIcon = createIconSetFromFontello(fontelloConfig);
import { colors } from '../../styles/common';

/**
 * Navigator component that wraps the
 * three main tabs: Browser, Wallet, Transfer
 */
export default createBottomTabNavigator(
	{
		Home: {
			screen: BrowserScreen,
			navigationOptions: () => ({
				title: 'ÐApps',
				tabBarIcon: ico => <CustomIcon name="dapp" size={18} color={ico.tintColor} />, // eslint-disable-line react/display-name
				tintColor: colors.primary
			})
		},
		Wallet: {
			screen: WalletScreen,
			navigationOptions: () => ({
				title: 'Wallet',
				tabBarIcon: ico => <CustomIcon name="wallet" size={20} color={ico.tintColor} />, // eslint-disable-line react/display-name
				tintColor: colors.primary
			})
		},
		Transfer: {
			screen: TransferScreen,
			navigationOptions: () => ({
				title: 'Transfer',
				tabBarIcon: ico => <Icon name="repeat" size={20} color={ico.tintColor} />, // eslint-disable-line react/display-name
				tintColor: colors.primary
			})
		}
	},
	{
		initialRouteName: 'Wallet',
		tabBarOptions: {
			activeTintColor: colors.primary,
			inactiveTintColor: colors.inactive,
			style: {
				borderTopWidth: StyleSheet.hairlineWidth
			}
		}
	}
);
