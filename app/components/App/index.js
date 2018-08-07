import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from 'react-navigation';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import BrowserScreen from '../BrowserScreen';
import Engine from '../../core/Engine';
import WalletScreen from '../WalletScreen';
import fontelloConfig from '../../fonts/config.json';
import { colors } from '../../styles/common';

const Icon = createIconSetFromFontello(fontelloConfig);

const engine = new Engine();

/**
 * Root application component responsible for configuring app navigation
 * and instantiating the core Engine module
 */
export default createBottomTabNavigator(
	{
		Home: {
			screen: function Home() {
				return <BrowserScreen engine={engine} />;
			},
			navigationOptions: () => ({
				title: 'ÐApps',
				tabBarIcon: ico => <Icon name="dapp" size={18} color={ico.tintColor} /> // eslint-disable-line react/display-name
			})
		},
		Wallet: {
			screen: function Home() {
				return <WalletScreen engine={engine} />;
			},
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
