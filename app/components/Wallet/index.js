import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { colors, fontStyles } from '../../styles/common';
import AccountOverview from '../AccountOverview';
import Tokens from '../Tokens';
import Collectibles from '../Collectibles';
import getNavbar from '../Navbar';

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

export default class Wallet extends Component {
	static navigationOptions = ({ navigation }) => getNavbar('Wallet', navigation);

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
					<Tokens tabLabel="TOKENS" />
					<Collectibles tabLabel="COLLECTIBLES" />
				</ScrollableTabView>
			</View>
		);
	}
}
