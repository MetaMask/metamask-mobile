import React, { Component } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View, AsyncStorage } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { colors, fontStyles } from '../../styles/common';
import AccountOverview from '../AccountOverview';
import Tokens from '../Tokens';
import Transactions from '../Transactions';
import Collectibles from '../Collectibles';
import getNavbarOptions from '../Navbar';
import { strings } from '../../../locales/i18n';
import Branch from 'react-native-branch';
import Logger from '../../util/Logger';
import DeeplinkManager from '../../core/DeeplinkManager';
import { fromWei, weiToFiat, hexToBN } from '../../util/number';

const LOCK_TIMEOUT = 3000;
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
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
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
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.array,
		/**
		 * An array that represents the user transactions
		 */
		transactions: PropTypes.array,
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

	state = {
		locked: false,
		appState: 'active'
	};

	mounted = false;
	scrollableTabViewRef = React.createRef();

	componentDidMount() {
		Branch.subscribe(this.handleDeeplinks);
		AppState.addEventListener('change', this.handleAppStateChange);
		this.mounted = true;
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;
		if (prevNavigation && navigation) {
			const prevPage = prevNavigation.getParam('page', null);
			const currentPage = navigation.getParam('page', null);
			if (currentPage && currentPage !== prevPage) {
				this.handleTabChange(currentPage);
			}
		}
	}
	handleTabChange = page => {
		this.scrollableTabViewRef && this.scrollableTabViewRef.current.goToPage(page);
	};

	componentWillUnmount() {
		this.mounted = false;
		AppState.removeEventListener('change', this.handleAppStateChange);
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

	handleAppStateChange = async nextAppState => {
		if (nextAppState !== 'active') {
			await AsyncStorage.setItem('@MetaMask:bg_mode_ts', Date.now().toString());
		} else if (this.state.appState !== 'active' && nextAppState === 'active') {
			const bg_mode_ts = await AsyncStorage.getItem('@MetaMask:bg_mode_ts');
			if (bg_mode_ts && Date.now() - parseInt(bg_mode_ts) > LOCK_TIMEOUT) {
				// If it's still mounted, lock it
				this.mounted && this.props.navigation.navigate('LockScreen');
			}
			AsyncStorage.removeItem('@MetaMask:bg_mode_ts');
		}
		this.mounted && this.setState({ appState: nextAppState });
	};

	renderContent() {
		const {
			accounts,
			conversionRate,
			currentCurrency,
			identities,
			selectedAddress,
			tokens,
			tokenBalances,
			tokenExchangeRates,
			collectibles,
			navigation,
			transactions
		} = this.props;
		let balance = 0;
		let assets = tokens;
		if (accounts[selectedAddress]) {
			balance = fromWei(accounts[selectedAddress].balance, 'ether');
			assets = [
				{
					name: 'Ether',
					symbol: 'ETH',
					balance,
					balanceFiat: weiToFiat(
						hexToBN(accounts[selectedAddress].balance),
						conversionRate,
						currentCurrency
					).toUpperCase(),
					logo: '../images/eth-logo.svg'
				},
				...tokens
			];
		} else {
			assets = tokens;
		}
		const account = { address: selectedAddress, ...identities[selectedAddress], ...accounts[selectedAddress] };

		return (
			<View style={styles.wrapper}>
				<AccountOverview
					account={account}
					conversionRate={conversionRate}
					currentCurrency={currentCurrency}
					navigation={navigation}
				/>
				<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
					<Tokens
						navigation={navigation}
						tabLabel={strings('wallet.tokens')}
						assets={assets}
						currentCurrency={currentCurrency}
						conversionRate={conversionRate}
						tokenBalances={tokenBalances}
						tokenExchangeRates={tokenExchangeRates}
					/>
					<Collectibles
						navigation={navigation}
						tabLabel={strings('wallet.collectibles')}
						assets={collectibles}
					/>
					<Transactions
						navigation={navigation}
						tabLabel={strings('wallet.transactions')}
						transactions={transactions}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						selectedAddress={selectedAddress}
					/>
				</ScrollableTabView>
			</View>
		);
	}

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	render() {
		return (
			<View style={styles.wrapper} testID={'wallet-screen'}>
				{this.props.selectedAddress ? this.renderContent() : this.renderLoader()}
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
	collectibles: state.backgroundState.AssetsController.collectibles,
	transactions: state.backgroundState.TransactionController.transactions
});

export default connect(mapStateToProps)(Wallet);
