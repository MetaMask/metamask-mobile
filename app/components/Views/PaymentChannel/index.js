import React, { PureComponent } from 'react';
import InstaPay from '../../../core/InstaPay';
import {
	InteractionManager,
	ScrollView,
	Alert,
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator,
	Clipboard,
	TextInput
} from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import getNavbarOptions from '../../UI/Navbar';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { toBN, balanceToFiatNumber } from '../../../util/number';
import AssetCard from '../AssetCard';
import Engine from '../../../core/Engine';
import { toChecksumAddress } from 'ethereumjs-util';
import { setPaymentChannelTransaction } from '../../../actions/transaction';
import Transactions from '../../UI/Transactions';
import { BNToHex } from 'gaba/util';
import Networks from '../../../util/networks';
import Modal from 'react-native-modal';
import PaymentChannelWelcome from './PaymentChannelWelcome';
import AsyncStorage from '@react-native-community/async-storage';
import AppConstants from '../../../core/AppConstants';
import Analytics from '../../../core/Analytics';
// eslint-disable-next-line import/named
import { withNavigationFocus } from 'react-navigation';
import { showAlert } from '../../../actions/alert';
import AddressQRCode from '../AddressQRCode';
import ChooseInstaPayUserModal from '../../UI/ChooseInstaPayUserModal';
import InstaPayUpgradeModal from '../../UI/InstaPayUpgradeModal';

const DAI_ADDRESS = AppConstants.DAI_ADDRESS;

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1,
		minHeight: 600
	},
	wrapper: {
		flex: 1,
		paddingBottom: 0
	},
	data: {
		backgroundColor: colors.grey000,
		borderBottomColor: colors.grey200,
		borderBottomWidth: 1
	},
	button: {
		paddingVertical: 5,
		width: '48%',
		height: 44
	},
	depositButton: {
		width: '80%',
		marginVertical: 15
	},
	buttonText: {
		fontSize: 14
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 120,
		justifyContent: 'center',
		alignItems: 'center'
	},
	assetCardWrapper: {
		marginTop: 16,
		marginHorizontal: 20
	},
	actionsWrapper: {
		flexDirection: 'column',
		marginVertical: 10,
		marginHorizontal: 20
	},
	secondActionsWrapper: {
		flexDirection: 'row',
		marginVertical: 10,
		justifyContent: 'space-between'
	},
	sendButton: {
		width: '100%',
		marginVertical: 10
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue
	},
	tabStyle: {
		paddingBottom: 0
	},
	tabTextStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	},
	noFundsWrapper: {
		marginHorizontal: 10,
		marginTop: 40,
		alignItems: 'center'
	},
	transactionsWrapper: {
		marginHorizontal: 0
	},
	noFundsTitle: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 18
	},
	noFundsDescription: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 12,
		margin: 20,
		textAlign: 'center',
		width: 250
	},
	bottomModal: {
		margin: 0
	},
	textInput: {
		width: '100%',
		marginTop: 30,
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.grey100,
		padding: 16,
		fontSize: 18,
		...fontStyles.normal
	},
	modalView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		flexDirection: 'column'
	},
	modalText: {
		fontSize: 18,
		textAlign: 'center',
		...fontStyles.normal
	},
	modalTitle: {
		fontSize: 22,
		marginBottom: 15,
		textAlign: 'center',
		...fontStyles.bold
	}
	// usernameWrapper: {
	// 	flex: 1,
	// 	alignItems: 'center',
	// 	justifyContent: 'center',
	// 	paddingVertical: 15
	// },
	// usernameText: {
	// 	fontSize: 20,
	// 	textAlign: 'center'
	// }
});

/**
/* View that contains all the UI to
/* deposit, send, receive and withdraw
/* instant payments
*/
class PaymentChannel extends PureComponent {
	static navigationOptions = ({ navigation }) => getNavbarOptions('payment_channel.insta_pay', navigation, true);

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * Symbol for base asset
		 */
		nativeCurrency: PropTypes.string,
		/**
		 * Currently-active ISO 4217 currency code
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		 * Action that sets a tokens type transaction
		 */
		setPaymentChannelTransaction: PropTypes.func,
		/**
		 * An array that represents the user transactions on chain
		 */
		transactions: PropTypes.array,
		/**
		 * An array that represents the user internal transactions
		 */
		internalTransactions: PropTypes.array,
		/**
		 * NetworkController povider object
		 */
		provider: PropTypes.object,
		/**
		 * Selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * React navigation prop to know if this view is focused
		 */
		isFocused: PropTypes.bool,
		/**
		 * Flag that determines if payment channels are enabled
		 */
		paymentChannelsEnabled: PropTypes.bool,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string
	};

	state = {
		ready: false,
		balance: '0.00',
		balanceFiat: undefined,
		status: { type: null },
		qrModalVisible: false,
		sendAmount: '',
		sendRecipient: '',
		depositAmount: '',
		exchangeRate: undefined,
		displayWelcomeModal: false,
		connextStateDisabled: false,
		transactions: [],
		xpub: null,
		wallet: null,
		username: null,
		newUsername: null,
		chooseUserModalVisible: false,
		upgradeModalVisible: false
	};

	client = null;
	sending = false;
	depositing = false;
	withdrawing = false;
	userSet = false;

	showUpgradeModal = () => {
		this.setState({ upgradeModalVisible: true });
	};

	hideUpgradeModal = () => {
		this.setState({ upgradeModalVisible: false });
	};

	componentWillUnmount = () => {
		InstaPay.hub.removeListener('migration::started', this.showUpgradeModal);
		InstaPay.hub.removeListener('migration::complete', this.hideUpgradeModal);
	};

	onNewUsernameChange = newUsername => {
		this.setState({ newUsername });
	};

	setUsername = async () => {
		if (this.state.settingUsername) return;
		try {
			this.setState({ settingUsername: true });
			const taken = await InstaPay.getXpubFromUsername(this.state.newUsername);
			if (taken) {
				Alert.alert('Username not available', 'Try with a different one');
				this.setState({ settingUsername: false });
			} else {
				await InstaPay.setUsername(this.state.newUsername);
				this.setState({
					settingUsername: false,
					chooseUserModalVisible: false
				});
			}
		} catch (e) {
			Alert.alert('Error', 'Please try again');
		}
	};

	onStateChange = state => {
		// TBD
		// if (!this.userSet && this.state.ready && !this.state.username && this.state.usernameSynced) {
		// 	this.userSet = true;
		// 	setTimeout(() => {
		// 		this.setState({ chooseUserModalVisible: true });
		// 	}, 100);
		// }

		this.setState({
			...state,
			transactions: this.handleTransactions(state.transactions)
		});
	};

	componentDidMount() {
		InteractionManager.runAfterInteractions(() => {
			this.init();
		});

		this.mounted = true;
	}

	init = () => {
		setTimeout(() => {
			InstaPay.hub.on('state::change', this.onStateChange);
			InstaPay.hub.on('migration::started', this.showUpgradeModal);
			InstaPay.hub.on('migration::complete', this.hideUpgradeModal);
		}, 1000);
		this.checkifEnabled();
	};

	checkifEnabled = async () => {
		const vars = Analytics.getRemoteVariables();
		if (vars && vars.paymentChannelsEnabled === false) {
			// If the user has funds we should
			// withdraw everything automatically
			if (parseFloat(this.state.balance) > 0) {
				Alert.alert(
					strings('payment_channel.disabled_withdraw_title'),
					strings('payment_channel.disabled_withdraw_message'),
					[
						{
							text: strings('payment_channel.disabled_withdraw_btn'),
							onPress: async () => {
								try {
									this.withdrawing = true;
									await InstaPay.withdrawAll();
									this.withdrawing = false;
									Logger.log('withdraw succesful');
								} catch (e) {
									this.withdrawing = false;
									Logger.log('withdraw error', e);
								}
								setTimeout(() => {
									this.props.navigation.pop();
								}, 1000);
							}
						}
					]
				);
			} else {
				Alert.alert(strings('payment_channel.disabled_title'), strings('payment_channel.disabled_message'), [
					{
						text: strings('payment_channel.disabled_btn'),
						onPress: () => {
							this.props.navigation.pop();
						}
					}
				]);
			}
		} else {
			const paymentChannelFirstTime = await AsyncStorage.getItem('@MetaMask:paymentChannelFirstTime', '');
			if (!paymentChannelFirstTime) {
				this.setState({ displayWelcomeModal: true });
			}
		}
	};

	componentDidUpdate(prevProps) {
		// Handle turning payment channels off from settings
		if (
			prevProps.isFocused !== this.props.isFocused &&
			!this.props.paymentChannelsEnabled &&
			this.props.isFocused
		) {
			this.props.navigation.navigate('BrowserView');
		}
		// Reinit on network / account changes
		if (
			prevProps.selectedAddress !== this.props.selectedAddress ||
			prevProps.provider.type !== this.props.provider.type
		) {
			//this.reinitialize();
		}
		this.updateBalanceFiat();
	}

	reinitialize = () => {
		Logger.log('InstaPay::reinitialize');
		this.removeListeners();
		this.setState({ ready: false });
		this.init();
	};

	handleTransactions = transactions => {
		let parsedTransactions = [];
		// Send and Receive
		if (transactions && transactions.length && this.state.xpub) {
			parsedTransactions = transactions.map(tx => ({
				time: Date.parse(tx.createdOn),
				status: 'confirmed',
				id: tx.id.toString(),
				paymentChannelTransaction: true,
				transaction: {
					from: tx.senderPublicIdentifier,
					to: tx.receiverPublicIdentifier,
					value: BNToHex(toBN(tx.amount)),
					paymentChannelAddress: this.state.xpub
				}
			}));
		}

		// Deposits
		const { transactions: onChainTransactions, provider, internalTransactions, selectedAddress } = this.props;

		this.state.wallet &&
			this.state.wallet.address &&
			onChainTransactions.forEach(tx => {
				if (
					tx.transaction.from.toLowerCase() === selectedAddress.toLowerCase() &&
					Networks[provider.type].networkId.toString() === tx.networkID &&
					tx.transaction.to.toLowerCase() === this.state.wallet.address.toLowerCase() &&
					tx.status === 'confirmed'
				) {
					parsedTransactions.push({
						...tx,
						actionKey: strings('transactions.instant_payment_deposit_tx'),
						paymentChannelTransaction: true,
						isInstaPayDeposit: true
					});
				}
			});

		// Withdrawals
		internalTransactions &&
			internalTransactions.forEach(tx => {
				if (
					Networks[provider.type].networkId.toString() === tx.networkID &&
					(tx.transaction.to && tx.transaction.to.toLowerCase()) === selectedAddress.toLowerCase()
				) {
					parsedTransactions.push({
						...tx,
						from: undefined,
						id: tx.transactionHash,
						actionKey: strings('transactions.instant_payment_withdraw_tx'),
						paymentChannelTransaction: true,
						isInstaPayWithdrawal: true
					});
				}
			});
		const sortedTransactions = parsedTransactions.sort((a, b) => b.time - a.time);
		return sortedTransactions;
	};

	componentWillUnmount() {
		this.removeListeners();
	}

	removeListeners() {
		InstaPay.hub.removeListener('state::change', this.onStateChange);
	}

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	withdraw = async () => {
		if (this.withdrawing) {
			return;
		}

		Alert.alert(
			strings('payment_channel.withdraw_funds'),
			`${strings('payment_channel.withdraw_intro')}. ${strings('payment_channel.withdraw_info')}.\n${strings(
				'payment_channel.withdraw_note'
			)}.`,
			[
				{
					text: strings('payment_channel.cancel'),
					onPress: () => false,
					style: 'cancel'
				},
				{
					text: strings('payment_channel.confirm'),
					onPress: async () => {
						try {
							this.withdrawing = true;
							await InstaPay.withdrawAll();
							this.withdrawing = false;
							Logger.log('withdraw succesful');
						} catch (e) {
							this.withdrawing = false;
							Logger.log('withdraw error', e);
						}
					}
				}
			],
			{ cancelable: false }
		);
	};

	onSend = () => {
		this.props.setPaymentChannelTransaction({
			address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
			decimals: 18,
			logo: 'dai.svg',
			symbol: 'DAI'
		});
		this.props.navigation.navigate('PaymentChannelSend');
	};

	onDeposit = () => {
		this.props.navigation.navigate('PaymentChannelDeposit');
	};

	renderInfo() {
		const { balance, balanceFiat } = this.state;
		const isDisabled = this.areButtonsDisabled();

		let mainBalance, secondaryBalance;
		if (this.props.primaryCurrency === 'ETH') {
			mainBalance =
				balance.channel.token.toDAI().format({ decimals: 2, symbol: false }) + ' ' + strings('unit.dai');
			secondaryBalance = balanceFiat;
		} else {
			mainBalance = balanceFiat;
			secondaryBalance =
				balance.channel.token.toFIN().format({ decimals: 2, symbol: false }) + ' ' + strings('unit.dai');
		}

		const noFunds = balance.channel.token.toDAI().format({ decimals: 2, symbol: false }) === '0.00';
		const noFundsAndNoHistory = noFunds && !this.state.transactions.length;

		return (
			<View style={styles.data}>
				<View style={styles.assetCardWrapper}>
					<AssetCard
						balance={mainBalance}
						balanceFiat={secondaryBalance}
						description={strings('payment_channel.asset_card_desc')}
						openQrModal={this.openQrModal}
					/>
				</View>
				<View style={styles.actionsWrapper}>
					{!noFundsAndNoHistory && (
						<View>
							<StyledButton
								containerStyle={[styles.button, styles.sendButton]}
								style={styles.buttonText}
								type={'confirm'}
								onPress={this.onSend}
								disabled={isDisabled || noFunds}
							>
								{strings('payment_channel.send_buttton')}
							</StyledButton>
							<View style={styles.secondActionsWrapper}>
								<StyledButton
									containerStyle={styles.button}
									style={styles.buttonText}
									type={'info'}
									onPress={this.onDeposit}
									disabled={isDisabled}
								>
									{strings('payment_channel.deposit_buttton')}
								</StyledButton>
								<StyledButton
									containerStyle={styles.button}
									style={styles.buttonText}
									type={'info'}
									onPress={this.withdraw}
									disabled={isDisabled || noFunds}
								>
									{strings('payment_channel.withdraw_buttton')}
								</StyledButton>
							</View>
						</View>
					)}
				</View>
				{/* <View style={styles.usernameWrapper}>
					{!this.state.username ? (
						<ActivityIndicator size="small" />
					) : (
						<Text style={styles.usernameText}>{this.state.username && `@${this.state.username}`}</Text>
					)}
				</View> */}
			</View>
		);
	}

	scan = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: meta => {
				if (meta.target_address) {
					this.setState({ sendRecipient: meta.target_address });
				}
			}
		});
	};

	updateBalanceFiat = async () => {
		if (!this.state.balance || !this.state.balance.channel || !this.state.balance.channel.token) return;
		const balance = this.state.balance.channel.token.toDAI().format({ decimals: 2, symbol: false });
		if (balance === this.lastKnownBalance) return;
		const { TokenRatesController } = Engine.context;
		const { nativeCurrency, currentCurrency, contractExchangeRates, conversionRate } = this.props;
		let exchangeRate;
		if (Object.keys(contractExchangeRates).includes(toChecksumAddress(DAI_ADDRESS))) {
			exchangeRate = contractExchangeRates[toChecksumAddress(DAI_ADDRESS)];
		} else {
			const res = await TokenRatesController.fetchExchangeRate(
				`contract_addresses=${DAI_ADDRESS}&vs_currencies=${nativeCurrency.toLowerCase()}`
			);
			if (!!res && Object.keys(res).includes(DAI_ADDRESS.toLowerCase())) {
				exchangeRate = res[DAI_ADDRESS.toLowerCase()][nativeCurrency.toLowerCase()];
			}
		}

		const balanceFiat =
			exchangeRate && `${balanceToFiatNumber(balance, conversionRate, exchangeRate)} ${currentCurrency}`;
		this.setState({ balanceFiat, exchangeRate });
		this.lastKnownBalance = balance;
	};

	closeQrModal = () => {
		this.setState({ qrModalVisible: false });
	};

	openQrModal = () => {
		this.setState({ qrModalVisible: true });
	};

	areButtonsDisabled = () => {
		const { pending, connextStateDisabled } = this.state;

		if (!pending.complete) {
			return true;
		}
		if (connextStateDisabled) {
			return connextStateDisabled;
		}
		return false;
	};

	renderNoFunds() {
		const isDisabled = this.areButtonsDisabled();

		return (
			<View>
				{this.renderInfo()}
				<View style={styles.noFundsWrapper}>
					<Text style={styles.noFundsTitle}>{strings('payment_channel.no_funds_title')}</Text>
					<Text style={styles.noFundsDescription}>{strings('payment_channel.no_funds_desc')}</Text>
					<StyledButton
						containerStyle={[styles.button, styles.depositButton]}
						style={styles.buttonText}
						type={'info'}
						onPress={this.onDeposit}
						testID={'submit-button'}
						disabled={isDisabled}
					>
						{strings('payment_channel.no_funds_action')}
					</StyledButton>

					<Text style={styles.noFundsDescription}>{strings('payment_channel.ask_a_friend')}</Text>
					<StyledButton
						containerStyle={[styles.button, styles.depositButton]}
						style={styles.buttonText}
						type={'info'}
						onPress={this.openQrModal}
						testID={'receive-button'}
					>
						{strings('payment_channel.receive_funds_action')}
					</StyledButton>
				</View>
			</View>
		);
	}

	renderTransactionsHistory() {
		const { navigation, conversionRate, currentCurrency, selectedAddress } = this.props;
		return (
			<ScrollView style={styles.transactionsWrapper}>
				<Transactions
					header={this.renderInfo()}
					navigation={navigation}
					transactions={this.state.transactions}
					conversionRate={conversionRate}
					currentCurrency={currentCurrency}
					exchangeRate={this.state.exchangeRate}
					selectedAddress={selectedAddress}
					loading={false}
				/>
			</ScrollView>
		);
	}

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.blue}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.tabTextStyle}
			/>
		);
	}

	renderContent() {
		// if (InstaPay.isRestoring()) {
		// 	return (
		// 		<View style={styles.loader}>
		// 			<ActivityIndicator size="small" />
		// 			<Text>Please wait while we restore your account</Text>
		// 			<Text>(This might take a couple of minutes...)</Text>
		// 		</View>
		// 	);
		// }

		if (!this.state.ready) {
			return (
				<View style={styles.loader}>
					<ActivityIndicator size="small" />
				</View>
			);
		}

		const noFunds = this.state.balance.channel.token.toDAI().format({ decimals: 2, symbol: false }) === '0.00';
		const noFundsAndNoHistory = noFunds && !this.state.transactions.length;
		return (
			<View>
				{noFundsAndNoHistory && this.renderNoFunds()}
				{!noFundsAndNoHistory && this.renderTransactionsHistory()}
			</View>
		);
	}

	closeWelcomeModal = async () => {
		await AsyncStorage.setItem('@MetaMask:paymentChannelFirstTime', '1');
		this.setState({ displayWelcomeModal: false });
	};

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'payment-channels-screen'}
				>
					<View style={styles.wrapper}>{this.renderContent()}</View>
				</ScrollView>
				<Modal
					isVisible={this.state.displayWelcomeModal}
					onBackdropPress={this.closeWelcomeModal}
					onSwipeComplete={this.closeWelcomeModal}
					swipeDirection={'down'}
					style={styles.bottomModal}
				>
					<PaymentChannelWelcome close={this.closeWelcomeModal} />
				</Modal>
				<Modal
					isVisible={this.state.qrModalVisible}
					onBackdropPress={this.closeQrModal}
					onBackButtonPress={this.closeQrModal}
					onSwipeComplete={this.closeQrModal}
					swipeDirection={'down'}
					propagateSwipe
				>
					<AddressQRCode closeQrModal={this.closeQrModal} address={this.state.xpub} />
				</Modal>
				<ChooseInstaPayUserModal
					modalVisible={this.state.chooseUserModalVisible}
					confirmText={'Confirm'}
					onConfirmPress={this.setUsername}
					loading={this.state.settingUsername}
				>
					<View style={styles.modalView}>
						<Text style={styles.modalTitle}>{'Choose your username'}</Text>
						<Text style={styles.modalText}>{'This will make it easier for others to pay you'}</Text>
						<TextInput
							style={styles.textInput}
							placeholder={''}
							autoCapitalize={'none'}
							autoCorrect={false}
							spellCheck={false}
							placeholderTextColor={colors.grey100}
							value={this.state.newUsername}
							onChangeText={this.onNewUsernameChange}
							onSubmitEditing={this.setUsername}
							returnKeyType={'done'}
						/>
					</View>
				</ChooseInstaPayUserModal>
				<InstaPayUpgradeModal modalVisible={this.state.upgradeModalVisible} />
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	internalTransactions: state.engine.backgroundState.TransactionController.internalTransactions,
	provider: state.engine.backgroundState.NetworkController.provider,
	paymentChannelsEnabled: state.settings.paymentChannelsEnabled,
	primaryCurrency: state.settings.primaryCurrency
});

const mapDispatchToProps = dispatch => ({
	setPaymentChannelTransaction: asset => dispatch(setPaymentChannelTransaction(asset)),
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withNavigationFocus(PaymentChannel));
