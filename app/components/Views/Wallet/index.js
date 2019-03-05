import React, { Component } from 'react';
import { InteractionManager, ActivityIndicator, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { toChecksumAddress } from 'ethereumjs-util';
import { colors, fontStyles } from '../../../styles/common';
import AccountOverview from '../../UI/AccountOverview';
import Tokens from '../../UI/Tokens';
import Transactions from '../../UI/Transactions';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import { renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import Engine from '../../../core/Engine';
import Networks, { isKnownNetwork } from '../../../util/networks';
import { showAlert } from '../../../actions/alert';
import CollectibleContracts from '../../UI/CollectibleContracts';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
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
	static navigationOptions = ({ navigation }) => getWalletNavbarOptions(strings('wallet.title'), navigation);

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
		collectibles: PropTypes.array,
		/**
		 * A string represeting the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func.isRequired
	};

	state = {
		showCollectible: false,
		transactionsUpdated: false
	};

	txs = [];
	txsPending = [];
	mounted = false;
	scrollableTabViewRef = React.createRef();

	async init() {
		const { AssetsDetectionController, AccountTrackerController } = Engine.context;
		AssetsDetectionController.detectAssets();
		AccountTrackerController.refresh();
		this.mounted = true;
		this.normalizeTransactions();
	}

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.init();
		});
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
		this.normalizeTransactions();
	}

	handleTabChange = page => {
		this.scrollableTabViewRef && this.scrollableTabViewRef.current.goToPage(page);
	};

	componentWillUnmount() {
		this.mounted = false;
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

	onHideCollectible = () => {
		this.setState({ showCollectible: false });
	};

	didTxStatusesChange = newTxsPending => this.txsPending.length !== newTxsPending.length;

	normalizeTransactions() {
		const { selectedAddress, networkType, transactions } = this.props;
		const networkId = Networks[networkType].networkId;
		if (transactions.length) {
			const txs = transactions.filter(
				tx =>
					((tx.transaction.from && toChecksumAddress(tx.transaction.from) === selectedAddress) ||
						(tx.transaction.to && toChecksumAddress(tx.transaction.to) === selectedAddress)) &&
					((networkId && networkId.toString() === tx.networkID) ||
						(networkType === 'rpc' && !isKnownNetwork(tx.networkID))) &&
					tx.status !== 'unapproved'
			);

			txs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));
			const newPendingTxs = txs.filter(tx => tx.status === 'pending');
			// To avoid extra re-renders we want to set the new txs only when
			// there's a new tx in the history or the status of one of the existing txs changed
			if (
				(this.txs.length === 0 && !this.state.transactionsUpdated) ||
				this.txs.length !== txs.length ||
				this.didTxStatusesChange(newPendingTxs)
			) {
				this.txs = txs;
				this.txsPending = newPendingTxs;
				this.setState({ transactionsUpdated: true });
			}
		} else if (!this.state.transactionsUpdated) {
			this.setState({ transactionsUpdated: true });
		}
	}

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
			networkType,
			showAlert
		} = this.props;
		let balance = 0;
		let assets = tokens;
		if (accounts[selectedAddress]) {
			balance = renderFromWei(accounts[selectedAddress].balance);
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
					logo: '../images/eth-logo.png'
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
					navigation={navigation}
					showAlert={showAlert}
					currentCurrency={currentCurrency}
				/>
				<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
					<Tokens
						navigation={navigation}
						tabLabel={strings('wallet.tokens')}
						tokens={assets}
						currentCurrency={currentCurrency}
						conversionRate={conversionRate}
						tokenBalances={tokenBalances}
						tokenExchangeRates={tokenExchangeRates}
						transactions={this.txs}
					/>
					<CollectibleContracts
						navigation={navigation}
						tabLabel={strings('wallet.collectibles')}
						collectibles={collectibles}
					/>
					<Transactions
						navigation={navigation}
						tabLabel={strings('wallet.transactions')}
						transactions={this.txs}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						selectedAddress={selectedAddress}
						networkType={networkType}
						loading={!this.state.transactionsUpdated}
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

	render = () => (
		<View style={styles.wrapper} testID={'wallet-screen'}>
			{this.props.selectedAddress ? this.renderContent() : this.renderLoader()}
		</View>
	);
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	identities: state.engine.backgroundState.PreferencesController.identities,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	tokenExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	collectibles: state.engine.backgroundState.AssetsController.collectibles,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Wallet);
