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
import { strings } from '../../../locales/i18n';
import Branch from 'react-native-branch';
import Logger from '../../util/Logger';
import DeeplinkManager from '../../core/DeeplinkManager';

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
	static navigationOptions = ({ navigation }) => getNavbarOptions(strings('wallet.title'), navigation);

	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * An object containing each identity in the format address => account
		 */
		identities: PropTypes.object,
		/**
		 * An string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.array,
		/**
		 * An object containing token balances for current account and network in the format address => balance
		 */
		tokenBalances: PropTypes.object,
		/**
		 * An object containing token exchange rates in the format address => exchangeRate
		 */
		tokenExchangeRates: PropTypes.object,
		/**
		 * An array that represents the user collectibles
		 */
		collectibles: PropTypes.array
	};
	componentDidMount() {
		Branch.subscribe(this.handleDeeplinks);
	}

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

	handleDeeplinks = async ({ error, params }) => {
		if (error) {
			Logger.error('Error from Branch: ' + error);
			return;
		}
		if (params['+non_branch_link']) {
			const dm = new DeeplinkManager(this.props.navigation);
			dm.parse(params['+non_branch_link']);
		}
	};

	render() {
		const {
			accounts,
			conversionRate,
			currentCurrency,
			identities,
			selectedAddress,
			tokens,
			tokenBalances,
			tokenExchangeRates,
			collectibles
		} = this.props;
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };
		return (
			<View style={styles.wrapper} testID={'wallet-screen'}>
				<AccountOverview
					account={account}
					conversionRate={conversionRate}
					currentCurrency={currentCurrency}
					navigation={this.props.navigation}
				/>
				<ScrollableTabView renderTabBar={this.renderTabBar}>
					<Tokens
						navigation={this.props.navigation}
						tabLabel={strings('wallet.tokens')}
						assets={tokens}
						currentCurrency={currentCurrency}
						conversionRate={conversionRate}
						tokenBalances={tokenBalances}
						tokenExchangeRates={tokenExchangeRates}
					/>
					<Collectibles
						navigation={this.props.navigation}
						tabLabel={strings('wallet.collectibles')}
						assets={collectibles}
					/>
				</ScrollableTabView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	accounts: state.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.backgroundState.CurrencyRateController.currentCurrency,
	identities: state.backgroundState.PreferencesController.identities,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress,
	tokens: state.backgroundState.AssetsController.tokens,
	tokenBalances: state.backgroundState.TokenBalancesController.contractBalances,
	tokenExchangeRates: state.backgroundState.TokenRatesController.contractExchangeRates,
	collectibles: state.backgroundState.AssetsController.collectibles
});

export default connect(mapStateToProps)(Wallet);
