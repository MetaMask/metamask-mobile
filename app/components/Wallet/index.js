import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
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

/**
 * Main view for the wallet
 */
class Wallet extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Wallet', navigation);

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * An object containing each identity in the format address => account
		 */
		accounts: PropTypes.object,
		/**
		 * An string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.array
	};

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.primary}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}

	render() {
		const { accounts, selectedAddress, tokens } = this.props;
		const account = accounts[selectedAddress];

		return (
			<View style={styles.wrapper} testID={'wallet-screen'}>
				<AccountOverview account={account} navigation={this.props.navigation} />
				<ScrollableTabView renderTabBar={this.renderTabBar}>
					<Tokens navigation={this.props.navigation} tabLabel="TOKENS" assets={tokens} />
					<Collectibles navigation={this.props.navigation} tabLabel="COLLECTIBLES" assets={[]} />
				</ScrollableTabView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.backgroundState.PreferencesController.identities,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress,
	tokens: state.backgroundState.PreferencesController.tokens
});

export default connect(mapStateToProps)(Wallet);
