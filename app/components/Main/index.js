import React from 'react';
import { createSwitchNavigator } from 'react-navigation';
import { createIconSetFromFontello } from 'react-native-vector-icons';

import BrowserScreen from '../BrowserScreen';
import WalletScreen from '../WalletScreen';

import fontelloConfig from '../../fonts/config.json';
const CustomIcon = createIconSetFromFontello(fontelloConfig);
import { colors } from '../../styles/common';
import { strings } from '../../../locales/i18n';

/**
 * Navigator component that wraps the
 * three main tabs: Browser, Wallet, Transfer
 */
export default createSwitchNavigator(
	{
		Browser: {
			screen: BrowserScreen,
			navigationOptions: () => ({
				tabBarTestID: 'browser-tab-button',
				title: strings('bottomTabBar.dapps'),
				tabBarIcon: ico => <CustomIcon name="dapp" size={18} color={ico.tintColor} />, // eslint-disable-line react/display-name
				tintColor: colors.primary
			})
		},
		Wallet: {
			screen: WalletScreen,
			navigationOptions: () => ({
				tabBarTestID: 'wallet-tab-button',
				title: strings('bottomTabBar.wallet'),
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
