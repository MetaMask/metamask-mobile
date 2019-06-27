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
import { renderFromWei, weiToFiat, toWei } from '../../../../util/number';

const KEYBOARD_OFFSET = 120;

const styles = StyleSheet.create({
	input: {
		...fontStyles.normal,
		backgroundColor: colors.white,
		color: colors.black,
		fontSize: 40,
		maxWidth: '70%'
	},
	fiatValue: {
		...fontStyles.normal,
		fontSize: 18,
		color: colors.grey500,
		marginVertical: 4
	},
	wrapper: {
		flex: 1,
		flexDirection: 'column',
		paddingTop: 24,
		paddingHorizontal: 24,
		flexGrow: 1
	},
	button: {
		marginBottom: 16
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
	inputWrapper: {
		flexDirection: 'row',
		marginVertical: 4
	},
	inputCurrency: {
		...fontStyles.normal,
		fontSize: 40,
		marginLeft: 20
	}
});

/**
/* View that contains all the UI to
/* deposit, send, receive and withdraw
/* instant payments
*/
class PaymentChannel extends Component {
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
		conversionRate: PropTypes.number
	};

	state = {
		balance: '0.00',
		balanceFiat: undefined,
		status: { type: null },
		qrModalVisible: false,
		sendAmount: '',
		sendRecipient: '',
		depositAmount: ''
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
		if (this.depositing) {
			return;
		}
		try {
			const params = {
				depositAmount: this.state.depositAmount
			};

			if (isNaN(params.depositAmount) || params.depositAmount.trim() === '') {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.invalid_amount'));
				return false;
			}

			const depositAmountNumber = parseFloat(params.depositAmount);
			const { MAX_DEPOSIT_TOKEN, getExchangeRate } = PaymentChannelsClient;

			const ETH = parseFloat(getExchangeRate());
			const maxDepositAmount = (MAX_DEPOSIT_TOKEN / ETH).toFixed(2);
			const minDepositAmount = AppConstants.CONNEXT.MIN_DEPOSIT_ETH;

			if (depositAmountNumber > maxDepositAmount) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.amount_too_high'));
				return false;
			}

			if (params.depositAmount < minDepositAmount) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.amount_too_low'));
				return false;
			}

			const accountBalance = renderFromWei(this.props.accounts[this.props.selectedAddress].balance);
			if (parseFloat(accountBalance) <= parseFloat(params.depositAmount)) {
				Alert.alert(strings('paymentChannels.error'), strings('paymentChannels.insufficient_funds'));
				return false;
			}

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
		const { amount, cryptoAmount } = this.state;
		return (
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
						onSubmitEditing={this.onNext}
						style={styles.input}
						ref={this.amountInput}
					/>
					<Text style={styles.inputCurrency}>{strings('unit.eth')}</Text>
				</View>

				<Text style={styles.fiatValue}>
					{weiToFiat(toWei(amount || 0), conversionRate, currentCurrency.toUpperCase())}
				</Text>
				{this.renderMinimumsOrSpinner()}

				<KeyboardAvoidingView
					style={styles.buttonsWrapper}
					behavior={'padding'}
					keyboardVerticalOffset={KEYBOARD_OFFSET}
					enabled={Platform.OS === 'ios'}
				>
					<View style={styles.buttonsContainer}>
						<StyledButton
							type={'blue'}
							onPress={this.onNext}
							containerStyle={[styles.button]}
							disabled={!cryptoAmount || cryptoAmount === '0'}
						>
							{'Load Funds'}
						</StyledButton>
					</View>
				</KeyboardAvoidingView>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate
});

export default connect(mapStateToProps)(PaymentChannel);
