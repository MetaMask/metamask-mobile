import React, { PureComponent } from 'react';
import { RefreshControl, ScrollView, InteractionManager, ActivityIndicator, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import AccountOverview from '../../UI/AccountOverview';
import Tokens from '../../UI/Tokens';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import { renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import Engine from '../../../core/Engine';
import CollectibleContracts from '../../UI/CollectibleContracts';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { getTicker } from '../../../util/transactions';
import OnboardingWizard from '../../UI/OnboardingWizard';
import { showTransactionNotification, hideTransactionNotification } from '../../../actions/transactionNotification';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';

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
class Wallet extends PureComponent {
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
		 * An array that represents the user collectibles
		 */
		collectibles: PropTypes.array,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Current onboarding wizard step
		 */
		wizardStep: PropTypes.number
	};

	state = {
		refreshing: false
	};

	accountOverviewRef = React.createRef();

	mounted = false;

	async init() {
		const { AssetsDetectionController, AccountTrackerController } = Engine.context;
		AssetsDetectionController.detectAssets();
		AccountTrackerController.refresh();
		this.mounted = true;
	}

	componentDidMount() {
		requestAnimationFrame(() => {
			this.init();
		});
	}

	onRefresh = async () => {
		requestAnimationFrame(async () => {
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
			// <<<<<<<<<<<<   FIX THIS   >>>>>>>>>>>>>>>>
			TransactionsNotificationManager.watchSubmittedTransaction({
				assetType: undefined,
				id: '8f1a6040-8a62-11ea-a323-37bfa8b52661',
				networkID: '4',
				origin: 'MetaMask Mobile',
				rawTransaction:
					'0xf86b07850189640200825208948f616d5c9ca50de70b871fc0b631ed12eaf4e4ba872386f26fc10000802ca0a0eb3e2c33c176da7ee5c01c477281fd53e5e21bf6ac6e0d6836c3f49c2707cda055f8c4efa0d9c5c2673646453f4d330b291b7e137c6660f02afbb7e3a4804c84',
				status: 'submitted',
				time: 1588196650052,
				transaction: {
					from: '0x8f616d5c9ca50de70b871fc0b631ed12eaf4e4ba',
					gas: '0x5208',
					gasPrice: '0x189640200',
					nonce: '0x7',
					to: '0x8f616d5c9ca50de70b871fc0b631ed12eaf4e4ba'
				},
				transactionHash: '0x4285f89f40a72cadb74238843e80c916ad7f6f34c6c4ff08d3d9b0262c8ffd38'
			});
		});
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

	onChangeTab = obj => {
		InteractionManager.runAfterInteractions(() => {
			if (obj.ref.props.tabLabel === strings('wallet.tokens')) {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_TOKENS);
			} else {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.WALLET_COLLECTIBLES);
			}
		});
	};

	onRef = ref => {
		this.accountOverviewRef = ref;
	};

	renderContent() {
		const {
			accounts,
			conversionRate,
			currentCurrency,
			identities,
			selectedAddress,
			tokens,
			collectibles,
			navigation,
			ticker
		} = this.props;

		let balance = 0;
		let assets = tokens;
		if (accounts[selectedAddress]) {
			balance = renderFromWei(accounts[selectedAddress].balance);
			assets = [
				{
					name: 'Ether',
					symbol: getTicker(ticker),
					isETH: true,
					balance,
					balanceFiat: weiToFiat(hexToBN(accounts[selectedAddress].balance), conversionRate, currentCurrency),
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
				<AccountOverview account={account} navigation={navigation} onRef={this.onRef} />
				<ScrollableTabView
					renderTabBar={this.renderTabBar}
					// eslint-disable-next-line react/jsx-no-bind
					onChangeTab={obj => this.onChangeTab(obj)}
				>
					<Tokens navigation={navigation} tabLabel={strings('wallet.tokens')} tokens={assets} />
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

	/**
	 * Return current step of onboarding wizard if not step 5 nor 0
	 */
	renderOnboardingWizard = () => {
		const { wizardStep } = this.props;
		return (
			[1, 2, 3, 4].includes(wizardStep) && (
				<OnboardingWizard navigation={this.props.navigation} coachmarkRef={this.accountOverviewRef} />
			)
		);
	};

	render = () => (
		<View style={baseStyles.flexGrow} testID={'wallet-screen'}>
			<ScrollView
				style={styles.wrapper}
				refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
			>
				{this.props.selectedAddress ? this.renderContent() : this.renderLoader()}
			</ScrollView>
			{this.renderOnboardingWizard()}
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
	collectibles: state.engine.backgroundState.AssetsController.collectibles,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	wizardStep: state.wizard.step
});

const mapDispatchToProps = dispatch => ({
	showTransactionNotification: args => dispatch(showTransactionNotification(args)),
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Wallet);
