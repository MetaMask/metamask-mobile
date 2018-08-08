import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { colors, fontStyles } from '../../styles/common';
import AccountOverview from '../AccountOverview';
import Tokens from '../Tokens';
import Collectibles from '../Collectibles';
import getNavbarOptions from '../Navbar';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.slate
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.primary
	},
	tabStyle: {
		paddingBottom: 0
	},
	textStyle: {
		fontSize: 16,
		letterSpacing: 0.5,
		...fontStyles.bold
	}
});

// This should be coming from redux / GABA store

const tokens = [
	{
		balance: 4,
		balanceFiat: 1500,
		logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
		symbol: 'ETH',
		name: 'Ethereum'
	},
	{
		balance: 20,
		balanceFiat: 104.2,
		logo: 'https://cdn.freebiesupply.com/logos/large/2x/omisego-logo-png-transparent.png',
		symbol: 'OMG',
		name: 'OmiseGo'
	}
];

const account = {
	address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
	balanceFiat: 1604.2,
	label: 'Account 1'
};

/**
 * Main view for the wallet
 */

export default class Wallet extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Wallet', navigation);

	static propTypes = {
		navigation: PropTypes.object
	};

	render() {
		return (
			<View style={styles.wrapper}>
				<AccountOverview account={account} />
				<ScrollableTabView
					renderTabBar={() => (
						// eslint-disable-line react/jsx-no-bind
						<DefaultTabBar
							underlineStyle={styles.tabUnderlineStyle}
							activeTextColor={colors.primary}
							inactiveTextColor={colors.fontTertiary}
							backgroundColor={colors.white}
							tabStyle={styles.tabStyle}
							textStyle={styles.textStyle}
						/>
					)}
				>
					<Tokens navigation={this.props.navigation} tabLabel="TOKENS" assets={tokens} />
					<Collectibles navigation={this.props.navigation} tabLabel="COLLECTIBLES" assets={[]} />
				</ScrollableTabView>
			</View>
		);
	}
}
