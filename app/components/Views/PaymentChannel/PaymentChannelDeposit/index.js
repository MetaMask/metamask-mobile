import React, { PureComponent } from 'react';
import InstaPay from '../../../../core/InstaPay';
import {
	SafeAreaView,
	Platform,
	TextInput,
	Alert,
	Text,
	View,
	StyleSheet,
	KeyboardAvoidingView,
	ActivityIndicator,
	TouchableWithoutFeedback,
	Keyboard
} from 'react-native';
import PropTypes from 'prop-types';
import { colors, fontStyles } from '../../../../styles/common';
import StyledButton from '../../../UI/StyledButton';
import { getTransactionOptionsTitle } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import AppConstants from '../../../../core/AppConstants';
import {
	weiToFiat,
	toWei,
	isDecimal,
	weiToFiatNumber,
	fiatNumberToWei,
	renderFromWei,
	fromWei,
	hexToBN
} from '../../../../util/number';
import { renderAccountName } from '../../../../util/address';
import Identicon from '../../../UI/Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import contractMap from 'eth-contract-metadata';
import AssetIcon from '../../../UI/AssetIcon';
import { getTicker } from '../../../../util/transactions';
import Modal from 'react-native-modal';
import AddressQRCode from '../../AddressQRCode';

const DAI_LOGO = contractMap[AppConstants.SAI_ADDRESS].logo;

const TOO_LOW = 'too_low';
const TOO_HIGH = 'too_high';
const KEYBOARD_OFFSET = 120;

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
		marginBottom: 8
	},
	buttonsWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignSelf: 'center'
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end',
		marginBottom: 24
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
	},
	secondaryValues: {
		flexDirection: 'row'
	}
});

/**
/* View that contains all the UI to
/* deposit, send, receive and withdraw
/* instant payments
*/
class Deposit extends PureComponent {
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
		identities: PropTypes.object,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string
	};

	state = {
		amount: undefined,
		validAmount: false,
		depositing: undefined,
		invalidAmountType: undefined,
		value: undefined,
		qrModalVisible: false
	};

	amountInput = React.createRef();

	componentDidMount = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: 'edit' });

		if (this.amountInput) {
			setTimeout(() => {
				const { current } = this.amountInput;
				current && current.focus();
			}, 300);
		}
		this.mount = true;
	};

	componentWillUnmount() {
		this.mounted = false;
	}

	deposit = async () => {
		if (this.state.depositing || !this.state.validAmount) {
			return;
		}
		try {
			const params = { depositAmount: this.state.value };
			Logger.log('About to deposit', params);
			this.setState({ depositing: true });
			await InstaPay.deposit(params);
			this.mounted && this.setState({ depositing: false });
			Logger.log('Deposit succesful');
		} catch (e) {
			if (e.message === 'still_blocked') {
				Alert.alert(strings('payment_channel.not_ready'), strings('payment_channel.please_wait'));
			} else if (e.message.includes('insufficient funds')) {
				Alert.alert(
					strings('payment_channel.heads_up'),
					`${strings('payment_channel.gas_error')} ${strings('payment_channel.security_reasons')}`
				);
			} else {
				Alert.alert(strings('payment_channel.heads_up'), strings('payment_channel.security_reasons'));
				Logger.log('Deposit error', e);
			}
			this.setState({ depositing: false });
			this.props.navigation.pop();
		}
	};

	openQrModal = () => {
		this.setState({ qrModalVisible: true });
	};

	closeQrModal = () => {
		this.setState({ qrModalVisible: false });
	};

	updateAmount = async amount => {
		const { conversionRate, primaryCurrency } = this.props;
		let processedValue;
		const pointAmount = amount.replace(',', '.');
		const validDecimal = isDecimal(pointAmount);
		if (validDecimal) {
			if (primaryCurrency === 'ETH') {
				processedValue = toWei(pointAmount);
			} else {
				processedValue = fiatNumberToWei(pointAmount, conversionRate);
			}
		}
		await this.setState({ amount, value: processedValue });
		this.validateDeposit();
	};

	validateDeposit = async () => {
		const { selectedAddress, accounts } = this.props;
		const { value, amount } = this.state;
		if (!amount) return;
		const { balance } = accounts[selectedAddress];
		let error, invalidAmountType;
		let validAmount = true;
		if (isDecimal(amount.replace(',', '.'))) {
			if (hexToBN(balance).lt(value)) {
				validAmount = false;
				error = strings('transaction.insufficient');
			}
		} else {
			validAmount = false;
			error = strings('transaction.invalid_amount');
		}

		const depositAmountNumber = parseFloat(fromWei(value));
		const { MAX_DEPOSIT_TOKEN, getExchangeRate } = InstaPay;

		const ETH = parseFloat(getExchangeRate());
		const maxDepositAmount = (MAX_DEPOSIT_TOKEN / ETH).toFixed(2);
		const minDepositAmount = AppConstants.CONNEXT.MIN_DEPOSIT_ETH;

		if (depositAmountNumber > maxDepositAmount) {
			validAmount = false;
			invalidAmountType = TOO_HIGH;
		}

		if (depositAmountNumber < minDepositAmount) {
			validAmount = false;
			invalidAmountType = TOO_LOW;
		}

		await this.setState({ validAmount, error, invalidAmountType });
		return validAmount;
	};

	promptValidationWarnings = () => {
		const { invalidAmountType } = this.state;
		switch (invalidAmountType) {
			case TOO_HIGH:
				Alert.alert(strings('payment_channel.error'), strings('payment_channel.amount_too_high'));
				break;
			case TOO_LOW:
				Alert.alert(strings('payment_channel.error'), strings('payment_channel.amount_too_low'));
				break;
		}
	};

	renderTransactionDirection() {
		if (!this.mounted) return null;
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
						<AssetIcon logo={DAI_LOGO} customStyle={styles.daiLogo} />
					</View>
					<Text style={styles.directionText} numberOfLines={1}>
						{strings('payment_channel.insta_pay')}
					</Text>
				</View>
			</View>
		);
	}

	renderMinimumsOrSpinner() {
		const { conversionRate, currentCurrency } = this.props;
		const maxETH = InstaPay.getMaximumDepositEth();
		const maxFiat =
			conversionRate &&
			maxETH &&
			isDecimal(maxETH) &&
			weiToFiat(toWei(maxETH), conversionRate, currentCurrency.toUpperCase());
		return (
			<React.Fragment>
				<Text style={styles.explainerText}>
					{`${strings('payment_channel.max_deposit')} `}
					<Text style={fontStyles.bold}>
						{maxETH} {strings('unit.eth')} {maxFiat && `(${maxFiat})`}
					</Text>
				</Text>
			</React.Fragment>
		);
	}

	render() {
		const { conversionRate, currentCurrency, ticker, primaryCurrency } = this.props;
		const { amount, validAmount, error, value, qrModalVisible } = this.state;
		let secondaryAmount, currency, secondaryCurrency;
		if (primaryCurrency === 'ETH') {
			secondaryAmount = weiToFiatNumber(value, conversionRate).toString();
			secondaryCurrency = currentCurrency;
			currency = getTicker(ticker);
		} else {
			secondaryAmount = renderFromWei(value);
			secondaryCurrency = getTicker(ticker);
			currency = currentCurrency;
		}
		return (
			<TouchableWithoutFeedback style={styles.root} onPress={Keyboard.dismiss}>
				<SafeAreaView style={styles.root}>
					{this.renderTransactionDirection()}
					<View style={styles.wrapper}>
						<Text style={styles.title}>{strings('payment_channel.deposit_amount')}</Text>
						<View style={styles.inputWrapper}>
							<TextInput
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="numeric"
								numberOfLines={1}
								onChangeText={this.updateAmount}
								placeholder={strings('payment_request.amount_placeholder')}
								placeholderTextColor={colors.grey100}
								spellCheck={false}
								value={amount}
								style={styles.input}
								ref={this.amountInput}
								returnKeyType="done"
								onSubmitEditing={this.validateDeposit}
								onBlur={this.promptValidationWarnings}
							/>
							<Text style={styles.inputCurrency}>{currency}</Text>
						</View>

						{secondaryAmount !== undefined && (
							<View style={styles.secondaryValues}>
								<Text style={styles.fiatValue} numberOfLines={1}>
									{secondaryAmount}
								</Text>
								<Text style={styles.fiatValue} numberOfLines={1}>
									{' ' + secondaryCurrency}
								</Text>
							</View>
						)}
						{this.renderMinimumsOrSpinner()}
						{!!error && <Text style={styles.invalidAmountError}>{error}</Text>}

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
									disabled={!amount || !validAmount}
								>
									{this.state.depositing ? (
										<ActivityIndicator size="small" color="white" />
									) : (
										strings('payment_channel.load_funds')
									)}
								</StyledButton>
								<StyledButton type={'transparent-blue'} onPress={this.openQrModal}>
									{strings('payment_channel.view_address')}
								</StyledButton>
							</View>
						</KeyboardAvoidingView>
					</View>
					<Modal
						isVisible={qrModalVisible}
						onBackdropPress={this.closeQrModal}
						onBackButtonPress={this.closeQrModal}
						onSwipeComplete={this.closeQrModal}
						swipeDirection={'down'}
						propagateSwipe
					>
						<AddressQRCode closeQrModal={this.closeQrModal} />
					</Modal>
				</SafeAreaView>
			</TouchableWithoutFeedback>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	identities: state.engine.backgroundState.PreferencesController.identities,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	primaryCurrency: state.settings.primaryCurrency
});

export default connect(mapStateToProps)(Deposit);
