import React, { Component } from 'react';
import PaymentChannelsClient from '../../../../core/PaymentChannelsClient';
import {
	Platform,
	TextInput,
	Alert,
	Text,
	View,
	StyleSheet,
	KeyboardAvoidingView,
	InteractionManager
} from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../../styles/common';
import StyledButton from '../../../UI/StyledButton';
import { getTransactionOptionsTitle } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import AppConstants from '../../../../core/AppConstants';
import { renderFromWei, weiToFiat, toWei, isDecimal, isBN } from '../../../../util/number';
import { renderAccountName } from '../../../../util/address';
import Identicon from '../../../UI/Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import contractMap from 'eth-contract-metadata';
import AssetIcon from '../../../UI/AssetIcon';
import { hexToBN } from 'gaba/util';

const KEYBOARD_OFFSET = 120;
const DAI_ADDRESS = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		flexDirection: 'column',
		paddingTop: 24,
		paddingHorizontal: 24,
		flexGrow: 1
	},
	button: {
		marginBottom: 24
	},
	buttonsWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignSelf: 'center'
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end'
	},
	fiatValue: {
		...fontStyles.normal,
		fontSize: 18,
		color: colors.grey500,
		marginVertical: 4
	},
	explainerText: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey500
	},
	title: {
		...fontStyles.normal,
		fontSize: 14,
		marginBottom: 4,
		color: colors.grey500
	},
	input: {
		...fontStyles.normal,
		backgroundColor: colors.white,
		color: colors.black,
		fontSize: 40,
		maxWidth: '70%',
		padding: 0
	},
	inputWrapper: {
		flexDirection: 'row',
		marginVertical: 4
	},
	inputCurrency: {
		...fontStyles.normal,
		fontSize: 40,
		marginLeft: 20,
		color: colors.black
	},
	arrow: {
		backgroundColor: colors.white,
		borderColor: colors.grey200,
		borderRadius: 15,
		borderWidth: 1,
		height: 30,
		width: 30,
		marginTop: -15,
		marginLeft: -15,
		left: '50%',
		position: 'absolute',
		zIndex: 1,
		alignSelf: 'center'
	},
	arrowIcon: {
		color: colors.grey400,
		marginLeft: 3,
		marginTop: 3
	},
	addressGraphic: {
		alignItems: 'center',
		flexDirection: 'row',
		minHeight: 42,
		width: '50%',
		flex: 1
	},
	fromGraphic: {
		borderColor: colors.grey100,
		borderRightWidth: 1,
		paddingRight: 35,
		paddingLeft: 20
	},
	toGraphic: {
		paddingRight: 20,
		paddingLeft: 35
	},
	graphic: {
		borderBottomWidth: 1,
		borderColor: colors.grey100,
		backgroundColor: colors.white100,
		borderTopWidth: 1,
		flexDirection: 'row',
		flexGrow: 0,
		flexShrink: 0
	},
	directionText: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 14,
		marginLeft: 8
	},
	daiLogo: {
		height: 16,
		width: 16,
		backgroundColor: colors.white
	},
	daiLogoWrapper: {
		width: 24,
		height: 24,
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		borderColor: colors.yellow,
		borderWidth: 1
	},
	invalidAmountError: {
		backgroundColor: colors.red000,
		color: colors.red,
		marginTop: 8,
		paddingVertical: 8,
		textAlign: 'center',
		fontSize: 12,
		...fontStyles.normal
	}
});

/**
/* View that contains all the UI to
/* deposit, send, receive and withdraw
/* instant payments
*/
class Deposit extends Component {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('deposit.title', navigation);

	static propTypes = {
		navigation: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* List of all available accounts
		*/
		accounts: PropTypes.object,
		/**
		 * Currently-active ISO 4217 currency code
		 */
		currentCurrency: PropTypes.string,
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object
	};

	state = {
		balance: '0.00',
		balanceFiat: undefined,
		status: { type: null },
		qrModalVisible: false,
		sendAmount: '',
		sendRecipient: '',
		depositAmount: '',
		amount: undefined,
		invalidAmount: true
	};

	amountInput = React.createRef();

	client = null;
	sending = false;
	depositing = false;
	withdrawing = false;

	componentDidMount = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: 'edit' });
		InteractionManager.runAfterInteractions(() => {
			this.amountInput.current && this.amountInput.current.focus();
		});
	};

	deposit = async () => {
		if (this.depositing || this.state.invalidAmount) {
			return;
		}
		try {
			const params = { depositAmount: this.state.amount };
			Logger.log('About to deposit', params);
			this.depositing = true;
			await PaymentChannelsClient.deposit(params);
			this.setState({ depositAmount: '' });
			this.depositing = false;
			Logger.log('Deposit succesful');
		} catch (e) {
			if (e.message === 'still_blocked') {
				Alert.alert(strings('paymentChannels.not_ready'), strings('paymentChannels.please_wait'));
			} else {
				Alert.alert(strings('paymentChannels.heads_up'), strings('paymentChannels.security_reasons'));
				Logger.log('Deposit error', e);
			}
			this.depositing = false;
		}
	};

	updateAmount = amount => {
		this.setState({ amount });
	};

	validateDeposit = () => {
		const { selectedAddress, accounts } = this.props;
		const { amount } = this.state;
		const { balance } = accounts[selectedAddress];
		let error = undefined;
		let invalidAmount = false;
		if (isDecimal(amount) && isBN(toWei(amount))) {
			if (hexToBN(balance).lt(toWei(amount))) {
				invalidAmount = true;
				error = strings('transaction.insufficient');
			}
		} else {
			invalidAmount = true;
			error = strings('transaction.invalid_amount');
		}

		if (isNaN(amount) || amount.trim() === '') {
			Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.invalid_amount'));
			return false;
		}

		const depositAmountNumber = parseFloat(amount);
		const { MAX_DEPOSIT_TOKEN, getExchangeRate } = PaymentChannelsClient;

		const ETH = parseFloat(getExchangeRate());
		const maxDepositAmount = (MAX_DEPOSIT_TOKEN / ETH).toFixed(2);
		const minDepositAmount = AppConstants.CONNEXT.MIN_DEPOSIT_ETH;

		if (depositAmountNumber > maxDepositAmount) {
			Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.amount_too_high'));
			invalidAmount = true;
		}

		if (amount < minDepositAmount) {
			Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.amount_too_low'));
			invalidAmount = true;
		}

		const accountBalance = renderFromWei(this.props.accounts[this.props.selectedAddress].balance);
		if (parseFloat(accountBalance) <= parseFloat(amount)) {
			Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.insufficient_funds'));
			invalidAmount = true;
		}
		this.setState({ invalidAmount, error });
	};

	renderTransactionDirection() {
		const { selectedAddress, identities } = this.props;
		return (
			<View style={styles.graphic}>
				<View style={[styles.addressGraphic, styles.fromGraphic]}>
					<Identicon address={selectedAddress} diameter={18} />
					<Text style={styles.directionText} numberOfLines={1}>
						{renderAccountName(selectedAddress, identities)}
					</Text>
				</View>
				<View style={styles.arrow}>
					<MaterialIcon name={'arrow-forward'} size={22} style={styles.arrowIcon} />
				</View>
				<View style={[styles.addressGraphic, styles.toGraphic]}>
					<View style={styles.daiLogoWrapper}>
						<AssetIcon logo={contractMap[DAI_ADDRESS].logo} customStyle={styles.daiLogo} />
					</View>
					<Text style={styles.directionText} numberOfLines={1}>
						InstaPay
					</Text>
				</View>
			</View>
		);
	}

	renderMinimumsOrSpinner() {
		const minFiat = PaymentChannelsClient.getMinimumDepositFiat();
		const maxFiat = PaymentChannelsClient.MAX_DEPOSIT_TOKEN.toFixed(2).toString();
		const maxETH = PaymentChannelsClient.getMaximumDepositEth();
		return (
			<React.Fragment>
				<Text style={styles.explainerText}>
					{`${strings('paymentChannels.min_deposit')} `}
					<Text style={fontStyles.bold}>
						{PaymentChannelsClient.MIN_DEPOSIT_ETH} ETH (${minFiat})
					</Text>
				</Text>
				<Text style={styles.explainerText}>
					{`${strings('paymentChannels.max_deposit')} `}
					<Text style={fontStyles.bold}>
						{maxETH} ETH (${maxFiat})
					</Text>
				</Text>
			</React.Fragment>
		);
	}

	render() {
		const { conversionRate, currentCurrency } = this.props;
		const { amount, invalidAmount, error } = this.state;
		const conversionAmount = weiToFiat(
			toWei((isDecimal(amount) && amount) || 0),
			conversionRate,
			currentCurrency.toUpperCase()
		);
		return (
			<View style={styles.root}>
				{this.renderTransactionDirection()}
				<View style={styles.wrapper}>
					<Text style={styles.title}>Amount to transfer</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="numeric"
							numberOfLines={1}
							onChangeText={this.updateAmount}
							placeholder={strings('payment_request.amount_placeholder')}
							spellCheck={false}
							value={amount}
							onSubmitEditing={this.deposit}
							style={styles.input}
							ref={this.amountInput}
							onBlur={this.validateDeposit}
							returnKeyType={'done'}
						/>
						<Text style={styles.inputCurrency}>{strings('unit.eth')}</Text>
					</View>

					<Text style={styles.fiatValue}>{conversionAmount}</Text>
					{this.renderMinimumsOrSpinner()}
					{error && <Text style={styles.invalidAmountError}>{error}</Text>}

					<KeyboardAvoidingView
						style={styles.buttonsWrapper}
						behavior={'padding'}
						keyboardVerticalOffset={KEYBOARD_OFFSET}
						enabled={Platform.OS === 'ios'}
					>
						<View style={styles.buttonsContainer}>
							<StyledButton
								type={'blue'}
								onPress={this.deposit}
								containerStyle={[styles.button]}
								disabled={!amount || invalidAmount}
							>
								{'Load Funds'}
							</StyledButton>
						</View>
					</KeyboardAvoidingView>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	identities: state.engine.backgroundState.PreferencesController.identities
});

export default connect(mapStateToProps)(Deposit);
