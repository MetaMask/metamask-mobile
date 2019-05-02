import React, { Component } from 'react';
import { RefreshControl, ScrollView, InteractionManager, ActivityIndicator, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { colors, fontStyles } from '../../../styles/common';
import AccountOverview from '../../UI/AccountOverview';
import Tokens from '../../UI/Tokens';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import { renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import Engine from '../../../core/Engine';
import { showAlert } from '../../../actions/alert';
import CollectibleContracts from '../../UI/CollectibleContracts';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue
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
	static navigationOptions = ({ navigation }) => getWalletNavbarOptions('wallet.title', navigation);

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
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func.isRequired,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string
	};

	state = {
		refreshing: false
	};

	mounted = false;

	async init() {
		const { AssetsDetectionController, AccountTrackerController } = Engine.context;
		AssetsDetectionController.detectAssets();
		AccountTrackerController.refresh();
		this.mounted = true;
	}

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.init();
		});
	}

	onRefresh = async () => {
		this.setState({ refreshing: true });
		const {
			AssetsDetectionController,
			AccountTrackerController,
			CurrencyRateController,
			TokenRatesController
		} = Engine.context;
		const actions = [
			AssetsDetectionController.detectAssets(),
			AccountTrackerController.refresh(),
			CurrencyRateController.poll(),
			TokenRatesController.poll()
		];
		await Promise.all(actions);
		this.setState({ refreshing: false });
	};

	componentWillUnmount() {
		this.mounted = false;
	}

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.blue}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
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
			showAlert,
			primaryCurrency
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
				<ScrollableTabView renderTabBar={this.renderTabBar}>
					<Tokens
						navigation={navigation}
						tabLabel={strings('wallet.tokens')}
						tokens={assets}
						currentCurrency={currentCurrency}
						conversionRate={conversionRate}
						primaryCurrency={primaryCurrency}
						tokenBalances={tokenBalances}
						tokenExchangeRates={tokenExchangeRates}
					/>
					<CollectibleContracts
						navigation={navigation}
						tabLabel={strings('wallet.collectibles')}
						collectibles={collectibles}
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
		<ScrollView
			style={styles.wrapper}
			testID={'wallet-screen'}
			refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
		>
			{this.props.selectedAddress ? this.renderContent() : this.renderLoader()}
		</ScrollView>
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
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	primaryCurrency: state.settings.primaryCurrency
});

const mapDispatchToProps = dispatch => ({
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Wallet);
