import React, { Component } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { colors, fontStyles } from '../../styles/common';
import AccountOverview from '../AccountOverview';
import Transactions from '../Transactions';
import Tokens from '../Tokens';
import Collectibles from '../Collectibles';
import Identicon from '../Identicon';
import Image from 'react-native-remote-svg';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		backgroundColor: colors.slate,
		flex: 1,
		justifyContent: 'center'
	},
	leftButton: {
		marginTop: 12,
		marginLeft: 12,
		marginBottom: 12
	},
	title: {
		flex: 1,
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'center'
	},
	logo: {
		width: 30,
		height: 30
	},
	titleText: {
		marginLeft: 10,
		fontSize: 20,
		...fontStyles.normal
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.primary
	},
	tabStyle: {
		paddingBottom: 0
	},
	textStyle: {
		...fontStyles.bold
	}
});

export default class Wallet extends Component {
	static navigationOptions = ({ navigation }) => ({
		title: 'Wallet',
		headerTitle: (
			<View style={styles.title}>
				<Image source={require('../../images/metamask-logo.svg')} style={styles.logo} />
				<Text style={styles.titleText}>MetaMask</Text>
			</View>
		),
		headerLeft: (
			<TouchableOpacity style={styles.leftButton} onPress={navigation.openDrawer}>
				<Identicon diameter={30} address="0xe7E125654064EEa56229f273dA586F10DF96B0a1" />
			</TouchableOpacity>
		)
	});

	render() {
		return (
			<View style={styles.wrapper}>
				<AccountOverview />
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
					<Transactions tabLabel="TRANSACTIONS" />
					<Tokens tabLabel="TOKENS" />
					<Collectibles tabLabel="COLLECTIBLES" />
				</ScrollableTabView>
			</View>
		);
	}
}
