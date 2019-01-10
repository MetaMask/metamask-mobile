import React, { Component } from 'react';
import { InteractionManager, ActivityIndicator, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { toChecksumAddress } from 'ethereumjs-util';
import { colors, fontStyles } from '../../styles/common';
import AccountOverview from '../AccountOverview';
import Tokens from '../Tokens';
import Transactions from '../Transactions';
import Collectibles from '../Collectibles';
import Modal from 'react-native-modal';
import getNavbarOptions from '../Navbar';
import { strings } from '../../../locales/i18n';
import Branch from 'react-native-branch';
import Logger from '../../util/Logger';
import DeeplinkManager from '../../core/DeeplinkManager';
import { renderFromWei, weiToFiat, hexToBN } from '../../util/number';
import Collectible from '../Collectible';
import Engine from '../../core/Engine';
import Networks, { isKnownNetwork } from '../../util/networks';
import AppConstants from '../../core/AppConstants';
import Feedback from '../../core/Feedback';
// eslint-disable-next-line import/no-unresolved
import LockManager from '../../core/LockManager';

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
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
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
		collectibles: PropTypes.array,
		/**
		 * A string represeting the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Time to auto-lock the app after it goes in background mode
		 */
		lockTime: PropTypes.number
	};

	state = {
		locked: false,
		showCollectible: false
	};

	txs = [];
	mounted = false;
	lockTimer = null;
	locked = false;
	scrollableTabViewRef = React.createRef();

	componentDidMount() {
		Branch.subscribe(this.handleDeeplinks);
		InteractionManager.runAfterInteractions(() => {
			Engine.refreshTransactionHistory();
			const { AssetsDetectionController, AccountTrackerController } = Engine.context;
			AssetsDetectionController.detectAssets();
			AccountTrackerController.refresh();
		});
		this.feedback = new Feedback({
			action: () => {
				this.props.navigation.push('BrowserView', { url: AppConstants.FEEDBACK_URL });
			}
		});
		this.lockManager = new LockManager(this.props.navigation, this.props.lockTime);
		this.mounted = true;
		this.normalizeTransactions();
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
		if (this.props.lockTime !== prevProps.lockTime) {
			this.lockManager.updateLockTime(this.props.lockTime);
		}
		this.normalizeTransactions();
	}

	handleTabChange = page => {
		this.scrollableTabViewRef && this.scrollableTabViewRef.current.goToPage(page);
	};

	componentWillUnmount() {
		this.mounted = false;
		this.feedback.stopListening();
		this.lockManager.stopListening();
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
			Logger.error('Error from Branch: ', error);
			return;
		}
		if (params['+non_branch_link']) {
			const dm = new DeeplinkManager(this.props.navigation);
			dm.parse(params['+non_branch_link']);
		}
	};

	onHideCollectible = () => {
		this.setState({ showCollectible: false });
	};

	onShowCollectible = collectible => {
		this.setState({ showCollectible: true, collectible });
	};

	renderAssetModal = () => {
		const { showCollectible, collectible } = this.state;
		return (
			<Modal
				isVisible={showCollectible}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onHideCollectible}
				onBackButtonPress={this.onHideCollectible}
			>
				<Collectible collectible={collectible} onHide={this.onHideCollectible} />
			</Modal>
		);
	};

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
			this.txs = txs;
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
			networkType
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
					conversionRate={conversionRate}
					currentCurrency={currentCurrency}
					navigation={navigation}
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
					<Collectibles
						navigation={navigation}
						tabLabel={strings('wallet.collectibles')}
						collectibles={collectibles}
						onPress={this.onShowCollectible}
					/>
					<Transactions
						navigation={navigation}
						tabLabel={strings('wallet.transactions')}
						transactions={this.txs}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						selectedAddress={selectedAddress}
						networkType={networkType}
					/>
				</ScrollableTabView>
				{this.renderAssetModal()}
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
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	lockTime: state.settings.lockTime
});

export default connect(mapStateToProps)(Wallet);
