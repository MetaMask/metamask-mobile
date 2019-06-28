import React, { Component } from 'react';
import PaymentChannelsClient from '../../../core/PaymentChannelsClient';
import {
	InteractionManager,
	ScrollView,
	Alert,
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator
} from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { balanceToFiat, toBN } from '../../../util/number';
import AssetCard from '../AssetCard';
import Engine from '../../../core/Engine';
import { toChecksumAddress } from 'ethereumjs-util';
import { setPaymentChannelTransaction } from '../../../actions/transaction';
import Transactions from '../../UI/Transactions';
import { BNToHex } from 'gaba/util';

const DAI_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1
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
		marginHorizontal: 10
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
		textAlign: 'center'
	}
});

/**
/* View that contains all the UI to
/* deposit, send, receive and withdraw
/* instant payments
*/
class PaymentChannel extends Component {
	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(`Instant Payments`, navigation);

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
		selectedAddress: PropTypes.string
	};

	state = {
		balance: '0.00',
		balanceFiat: undefined,
		status: { type: null },
		qrModalVisible: false,
		sendAmount: '',
		sendRecipient: '',
		depositAmount: '',
		exchangeRate: undefined
	};

	client = null;
	sending = false;
	depositing = false;
	withdrawing = false;

	onStateChange = state => {
		this.setState({
			balance: state.balance,
			status: state.status
		});
		this.getBalanceFiat(state.balance);
	};

	componentDidMount = async () => {
		InteractionManager.runAfterInteractions(async () => {
			const state = PaymentChannelsClient.getState();
			this.setState({
				balance: state.balance,
				status: state.status,
				transactions: this.handleTransactions(state.transactions),
				ready: true
			});
			this.getBalanceFiat(state.balance);
		});
		PaymentChannelsClient.hub.on('state::change', this.onStateChange);
		this.mounted = true;
	};

	handleTransactions = transactions => {
		const parsedTransactions = transactions.map(tx => ({
			time: Date.parse(tx.createdOn),
			status: 'confirmed',
			id: tx.id.toString(),
			paymentChannelTransaction: true,
			transaction: {
				from: tx.sender,
				to: tx.recipient,
				value: BNToHex(toBN(tx.amount.amountToken))
			}
		}));
		return parsedTransactions;
	};

	componentWillUnmount() {
		PaymentChannelsClient.hub.removeListener('state::change', this.onStateChange);
	}

	send = async () => {
		if (this.sending) {
			return;
		}

		try {
			const params = {
				sendRecipient: this.state.sendRecipient,
				sendAmount: this.state.sendAmount
			};

			if (isNaN(params.sendAmount) || params.sendAmount.trim() === '') {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.enter_the_amount'));
				return false;
			}

			if (!params.sendRecipient) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.enter_the_recipient'));
			}

			Logger.log('Sending ', params);
			this.sending = true;
			await PaymentChannelsClient.send(params);
			this.sending = false;

			Logger.log('Send succesful');
		} catch (e) {
			let msg = strings('paymentChannels.unknown_error');
			if (e.message === 'insufficient_balance') {
				msg = strings('paymentChannels.insufficient_balance');
			}
			Alert.alert(strings('paymentChannels.error'), msg);
			Logger.log('buy error error', e);
			this.sending = false;
		}
	};

	withdraw = async () => {
		if (this.withdrawing) {
			return;
		}
		Alert.alert(
			'Withdraw Funds',
			`${strings('paymentChannels.withdraw_intro')}. ${strings('paymentChannels.withdraw_info')}.\n${strings(
				'paymentChannels.withdraw_note'
			)}.`,
			[
				{
					text: 'Cancel',
					onPress: () => false,
					style: 'cancel'
				},
				{
					text: 'Confirm',
					onPress: async () => {
						try {
							this.withdrawing = true;
							//await PaymentChannelsClient.withdrawAll();
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
		const noFunds = this.state.balance === '0.00';
		return (
			<View style={styles.data}>
				<View style={styles.assetCardWrapper}>
					<AssetCard
						balance={balance + ' ' + strings('unit.dai')}
						balanceFiat={balanceFiat}
						description={'Free Transactions with Connext Payment Channels'}
					/>
				</View>
				<View style={styles.actionsWrapper}>
					{!noFunds && (
						<View>
							<StyledButton
								containerStyle={[styles.button, styles.sendButton]}
								style={styles.buttonText}
								type={'confirm'}
								onPress={this.onSend}
								disabled={isDisabled || noFunds}
							>
								{'Send'}
							</StyledButton>
							<View style={styles.secondActionsWrapper}>
								<StyledButton
									containerStyle={styles.button}
									style={styles.buttonText}
									type={'info'}
									onPress={this.onDeposit}
									disabled={isDisabled}
								>
									{'Deposit'}
								</StyledButton>
								<StyledButton
									containerStyle={styles.button}
									style={styles.buttonText}
									type={'info'}
									onPress={this.withdraw}
									disabled={isDisabled || noFunds}
								>
									{'Withdraw'}
								</StyledButton>
							</View>
						</View>
					)}
				</View>
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

	getBalanceFiat = async balance => {
		const { TokenRatesController } = Engine.context;
		const { nativeCurrency, currentCurrency, contractExchangeRates, conversionRate } = this.props;
		let exchangeRate;
		if (Object.keys(contractExchangeRates).includes(toChecksumAddress(DAI_ADDRESS))) {
			exchangeRate = contractExchangeRates[toChecksumAddress(DAI_ADDRESS)];
		} else {
			const res = await TokenRatesController.fetchExchangeRate(
				`contract_addresses=${DAI_ADDRESS}&vs_currencies=${nativeCurrency.toLowerCase()}`
			);
			if (!!res && Object.keys(res).includes(DAI_ADDRESS)) {
				exchangeRate = res[DAI_ADDRESS][nativeCurrency.toLowerCase()];
			}
		}

		const balanceFiat = exchangeRate && balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
		this.setState({ balanceFiat, exchangeRate });
	};

	closeQrModal = () => {
		this.setState({ qrModalVisible: false });
	};

	openQrModal = () => {
		this.setState({ qrModalVisible: true });
	};

	areButtonsDisabled = () => {
		const { status } = this.state;
		if (status && status.type) {
			return status.type.indexOf('_PENDING') !== -1;
		}
		return false;
	};

	renderNoFunds() {
		return (
			<React.Fragment>
				<View style={styles.noFundsWrapper}>
					<Text style={styles.noFundsTitle}>No Funds</Text>
					<Text style={styles.noFundsDescription}>
						Deposit eth into your InstaPay card to start making instant free paymentts with DAI.{' '}
					</Text>
					<StyledButton
						containerStyle={[styles.button, styles.depositButton]}
						style={styles.buttonText}
						type={'info'}
						onPress={this.deposit}
						testID={'submit-button'}
					>
						Deposit Funds
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderTransactionsHistory() {
		const { navigation, conversionRate, currentCurrency, selectedAddress } = this.props;
		return (
			<ScrollView>
				<View style={styles.noFundsWrapper}>
					<Text style={styles.noFundsTitle}>Transactions history</Text>
					<Transactions
						navigation={navigation}
						transactions={this.state.transactions}
						conversionRate={conversionRate}
						currentCurrency={currentCurrency}
						exchangeRate={this.state.exchangeRate}
						selectedAddress={selectedAddress}
						loading={false}
					/>
				</View>
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
		if (!this.state.ready) {
			return (
				<View style={styles.loader}>
					<ActivityIndicator size="small" />
				</View>
			);
		}
		const noFunds = this.state.balance === '0.00';

		return (
			<React.Fragment>
				{this.renderInfo()}
				{noFunds && this.renderNoFunds()}
				{!noFunds && this.renderTransactionsHistory()}
			</React.Fragment>
		);
	}

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
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate
});

const mapDispatchToProps = dispatch => ({
	setPaymentChannelTransaction: asset => dispatch(setPaymentChannelTransaction(asset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PaymentChannel);
