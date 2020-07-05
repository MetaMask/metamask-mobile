import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import {
	getRenderableEthGasFee,
	getRenderableFiatGasFee,
	apiEstimateModifiedToWEI,
	getBasicGasEstimates
} from '../../../util/custom-gas';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { BN } from 'ethereumjs-util';
import { fromWei, renderWei, hexToBN, isDecimal, isBN } from '../../../util/number';
import { getTicker, getNormalizedTxState } from '../../../util/transactions';
import { safeToChecksumAddress } from '../../../util/address';
import Radio from '../Radio';
import StyledButton from '../../UI/StyledButton';

const styles = StyleSheet.create({
	root: {
		paddingHorizontal: 24
	},
	customGasHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		paddingBottom: 20
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14,
		alignSelf: 'center'
	},
	optionsContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: 20
	},
	basicButton: {
		width: 116,
		height: 36,
		padding: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	optionSelected: {
		backgroundColor: colors.grey000,
		borderWidth: 1,
		borderRadius: 20,
		borderColor: colors.grey100
	},
	textOptions: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.black
	},
	message: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12,
		paddingBottom: 20
	},
	warningWrapper: {
		marginBottom: 20,
		height: 50,
		alignItems: 'center',
		justifyContent: 'center'
	},
	warningTextWrapper: {
		width: '100%',
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	warningText: {
		color: colors.red,
		fontSize: 12,
		...fontStyles.normal
	},
	invisible: {
		opacity: 0
	},
	titleContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	radio: {
		marginLeft: 'auto'
	},
	selectors: {
		position: 'relative',
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		marginBottom: 8
	},
	selector: {
		alignSelf: 'stretch',
		textAlign: 'center',
		alignItems: 'flex-start',
		width: '33.333333333%',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: colors.grey100,
		marginLeft: -2
	},
	selectorSelected: {
		backgroundColor: colors.blue000,
		borderColor: colors.blue,
		zIndex: 1
	},
	slow: {
		borderBottomStartRadius: 6,
		borderTopStartRadius: 6
	},
	fast: {
		borderBottomEndRadius: 6,
		borderTopEndRadius: 6
	},
	text: {
		...fontStyles.normal,
		fontSize: 10,
		color: colors.black
	},
	textTitle: {
		...fontStyles.bold,
		fontSize: 10,
		color: colors.black
	},
	textTime: {
		...fontStyles.bold,
		color: colors.black,
		marginVertical: 4,
		fontSize: 18,
		textTransform: 'none'
	},
	loaderContainer: {
		height: 200,
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center'
	},
	advancedOptionsContainer: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	valueRow: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20
	},
	advancedOptionsText: {
		flex: 1,
		textAlign: 'left',
		...fontStyles.light,
		color: colors.black,
		fontSize: 16
	},
	totalGasWrapper: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		paddingVertical: 8,
		paddingRight: 20
	},
	textTotalGas: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 14
	},
	gasInput: {
		flex: 1,
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 8,
		borderWidth: 1,
		fontSize: 14,
		paddingHorizontal: 10,
		paddingVertical: 8,
		position: 'relative'
	}
});

/**
 * PureComponent that renders a selector to choose either fast, average or slow gas fee
 */
class CustomGas extends PureComponent {
	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		/* conversion rate of ETH - FIAT
		*/
		conversionRate: PropTypes.any,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string,
		/**
		 * Callback triggered when gas fee is selected
		 */
		handleGasFeeSelection: PropTypes.func,
		/**
		 * Object BN containing estimated gas limit
		 */
		gas: PropTypes.object,
		/**
		 * Object BN containing gas price
		 */
		gasPrice: PropTypes.object,
		/**
		 * Callback to modify state in parent state
		 */
		onPress: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Displayed when there is a gas station error
		 */
		gasError: PropTypes.string,
		/**
		 * Changes the mode to 'review'
		 */
		review: PropTypes.func,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object
	};

	state = {
		basicGasEstimates: {},
		gasFastSelected: false,
		gasAverageSelected: true,
		gasSlowSelected: false,
		averageGwei: 0,
		averageWait: undefined,
		fastGwei: 0,
		fastWait: undefined,
		safeLowGwei: 0,
		safeLowWait: undefined,
		selected: 'average',
		ready: false,
		advancedCustomGas: false,
		customGasPrice: '10',
		customGasLimit: fromWei(this.props.gas, 'wei'),
		customGasPriceBN: this.props.gasPrice,
		customGasLimitBN: this.props.gas,
		warningGasLimit: '',
		warningGasPrice: '',
		warningSufficientFunds: ''
	};

	onPressGasFast = () => {
		const { fastGwei } = this.state;
		const { onPress } = this.props;
		onPress && onPress();
		this.setState({
			gasFastSelected: true,
			gasAverageSelected: false,
			gasSlowSelected: false,
			selected: 'fast',
			customGasPrice: fastGwei
		});
	};

	onPressGasAverage = () => {
		const { averageGwei } = this.state;
		const { onPress } = this.props;
		onPress && onPress();
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: true,
			gasSlowSelected: false,
			selected: 'average',
			customGasPrice: averageGwei
		});
	};

	onPressGasSlow = () => {
		const { safeLowGwei } = this.state;
		const { onPress } = this.props;
		onPress && onPress();
		this.setState({
			gasFastSelected: false,
			gasAverageSelected: false,
			gasSlowSelected: true,
			selected: 'slow',
			customGasPrice: safeLowGwei
		});
	};

	toggleAdvancedOptions = () => {
		const { advancedCustomGas, customGasPrice } = this.state;
		const { gas } = this.props;
		this.setState({ advancedCustomGas: !advancedCustomGas });
		if (!advancedCustomGas) {
			this.setState({ customGasLimit: fromWei(gas, 'wei') });
			this.props.handleGasFeeSelection(gas, apiEstimateModifiedToWEI(customGasPrice));
		}
	};

	componentDidMount = async () => {
		const { gas, gasPrice } = this.props;
		await this.handleFetchBasicEstimates();
		const warningSufficientFunds = this.hasSufficientFunds(gas, gasPrice);
		const { ticker } = this.props;
		if (ticker && ticker !== 'ETH') this.setState({ advancedCustomGas: true });
		//Applies ISF error if present before any gas modifications
		this.setState({ warningSufficientFunds });
	};

	componentDidUpdate = prevProps => {
		if (this.state.advancedCustomGas) {
			this.handleGasRecalculationForCustomGasInput(prevProps);
		}
	};

	handleGasRecalculationForCustomGasInput = prevProps => {
		const actualGasLimitWei = renderWei(hexToBN(this.props.gas));
		if (renderWei(hexToBN(prevProps.gas)) !== actualGasLimitWei)
			this.setState({ customGasLimit: actualGasLimitWei });
	};

	handleFetchBasicEstimates = async () => {
		this.setState({ ready: false });
		const basicGasEstimates = await getBasicGasEstimates();
		this.setState({ ...basicGasEstimates, ready: true });
	};

	//Validate locally instead of in TransactionEditor, otherwise cannot change back to review mode if insufficient funds
	hasSufficientFunds = (gas, gasPrice) => {
		const {
			transaction: { from, value }
		} = this.props;
		const checksummedFrom = safeToChecksumAddress(from) || '';
		const fromAccount = this.props.accounts[checksummedFrom];
		if (fromAccount && isBN(gas) && isBN(gasPrice) && hexToBN(fromAccount.balance).lt(gas.mul(gasPrice)))
			return strings('transaction.insufficient');
		if (hexToBN(fromAccount.balance).lt(gas.mul(gasPrice).add(value))) return strings('transaction.insufficient');
		return '';
	};

	onGasLimitChange = value => {
		const { customGasPriceBN } = this.state;
		const bnValue = new BN(value);
		const warningSufficientFunds = this.hasSufficientFunds(bnValue, customGasPriceBN);
		let warningGasLimit;
		if (!value || value === '' || !isDecimal(value)) warningGasLimit = strings('transaction.invalid_gas');
		else if (bnValue && !isBN(bnValue)) warningGasLimit = strings('transaction.invalid_gas');
		else if (bnValue.lt(new BN(21000)) || bnValue.gt(new BN(7920028)))
			warningGasLimit = strings('custom_gas.warning_gas_limit');

		this.setState({
			customGasLimit: value,
			customGasLimitBN: bnValue,
			warningGasLimit,
			warningSufficientFunds
		});
	};

	onGasPriceChange = value => {
		const { customGasLimitBN } = this.state;
		//Added because apiEstimateModifiedToWEI doesn't like empty strings
		const gasPrice = value === '' ? '0' : value;
		const gasPriceBN = apiEstimateModifiedToWEI(gasPrice);
		const warningSufficientFunds = this.hasSufficientFunds(customGasLimitBN, gasPriceBN);
		let warningGasPrice;
		if (!value || value === '' || !isDecimal(value) || value <= 0)
			warningGasPrice = strings('transaction.invalid_gas_price');
		if (gasPriceBN && !isBN(gasPriceBN)) warningGasPrice = strings('transaction.invalid_gas_price');
		this.setState({
			customGasPrice: value,
			customGasPriceBN: gasPriceBN,
			warningGasPrice,
			warningSufficientFunds
		});
	};

	//Handle gas fee selection when save button is pressed instead of everytime a change is made, otherwise cannot switch back to review mode if there is an error
	saveCustomGasSelection = () => {
		const {
			selected,
			fastGwei,
			averageGwei,
			safeLowGwei,
			customGasLimit,
			customGasPrice,
			advancedCustomGas
		} = this.state;
		const { review, gas, handleGasFeeSelection } = this.props;
		if (advancedCustomGas) {
			handleGasFeeSelection(new BN(customGasLimit), apiEstimateModifiedToWEI(customGasPrice));
		} else {
			if (selected === 'slow') handleGasFeeSelection(gas, apiEstimateModifiedToWEI(safeLowGwei));
			if (selected === 'average') handleGasFeeSelection(gas, apiEstimateModifiedToWEI(averageGwei));
			if (selected === 'fast') handleGasFeeSelection(gas, apiEstimateModifiedToWEI(fastGwei));
		}
		review();
	};

	renderCustomGasSelector = () => {
		const {
			averageGwei,
			fastGwei,
			safeLowGwei,
			averageWait,
			safeLowWait,
			fastWait,
			gasSlowSelected,
			gasAverageSelected,
			gasFastSelected
		} = this.state;
		const { conversionRate, currentCurrency, gas } = this.props;
		const ticker = getTicker(this.props.ticker);
		return (
			<View style={styles.selectors}>
				<TouchableOpacity
					key={'safeLow'}
					onPress={this.onPressGasSlow}
					style={[styles.selector, styles.slow, gasSlowSelected && styles.selectorSelected]}
				>
					<View style={styles.titleContainer}>
						<Text style={styles.textTitle}>{strings('transaction.gas_fee_slow')}</Text>
						<View style={styles.radio}>
							<Radio selected={gasSlowSelected} />
						</View>
					</View>
					<Text style={styles.textTime}>{safeLowWait}</Text>
					<Text style={styles.text}>
						{getRenderableEthGasFee(safeLowGwei, gas)} {ticker}
					</Text>
					<Text style={styles.text}>
						{getRenderableFiatGasFee(safeLowGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'average'}
					onPress={this.onPressGasAverage}
					style={[styles.selector, gasAverageSelected && styles.selectorSelected]}
				>
					<View style={styles.titleContainer}>
						<Text style={styles.textTitle}>{strings('transaction.gas_fee_average')}</Text>
						<View style={styles.radio}>
							<Radio selected={gasAverageSelected} />
						</View>
					</View>
					<Text style={styles.textTime}>{averageWait}</Text>
					<Text style={styles.text}>
						{getRenderableEthGasFee(averageGwei, gas)} {ticker}
					</Text>
					<Text style={styles.text}>
						{getRenderableFiatGasFee(averageGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					key={'fast'}
					onPress={this.onPressGasFast}
					style={[styles.selector, styles.fast, gasFastSelected && styles.selectorSelected]}
				>
					<View style={styles.titleContainer}>
						<Text style={styles.textTitle}>{strings('transaction.gas_fee_fast')}</Text>
						<View style={styles.radio}>
							<Radio selected={gasFastSelected} />
						</View>
					</View>
					<Text style={styles.textTime}>{fastWait}</Text>
					<Text style={styles.text}>
						{getRenderableEthGasFee(fastGwei, gas)} {ticker}
					</Text>
					<Text style={styles.text}>
						{getRenderableFiatGasFee(fastGwei, conversionRate, currentCurrency, gas)}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	renderCustomGasInput = () => {
		const { customGasPrice, customGasLimitBN, customGasPriceBN } = this.state;
		const totalGas = customGasLimitBN.mul(customGasPriceBN);
		const ticker = getTicker(this.props.ticker);
		return (
			<View style={styles.advancedOptionsContainer}>
				<View style={styles.valueRow}>
					<Text style={styles.advancedOptionsText}>{strings('custom_gas.total')}</Text>
					<View style={styles.totalGasWrapper}>
						<Text style={styles.textTotalGas}>
							{fromWei(totalGas)} {ticker}
						</Text>
					</View>
				</View>
				<View style={styles.valueRow}>
					<Text style={styles.advancedOptionsText}>{strings('custom_gas.gas_limit')}</Text>
					<TextInput
						keyboardType="numeric"
						style={styles.gasInput}
						onChangeText={this.onGasLimitChange}
						//useing BN here due to a glitch that causes it to sometimes render as x.00000001
						value={customGasLimitBN.toString()}
					/>
				</View>
				<View style={styles.valueRow}>
					<Text style={styles.advancedOptionsText}>{strings('custom_gas.gas_price')}</Text>
					<TextInput
						keyboardType="numeric"
						style={styles.gasInput}
						onChangeText={this.onGasPriceChange}
						value={customGasPrice.toString()}
					/>
				</View>
			</View>
		);
	};

	renderGasError = () => {
		const { warningGasLimit, warningGasPrice, warningSufficientFunds } = this.state;
		const { gasError } = this.props;
		const hideError = !warningGasLimit && !warningGasPrice && !warningSufficientFunds && !gasError;
		const gasErrorMessage = warningGasPrice || warningGasLimit || warningSufficientFunds || gasError;
		return (
			<View style={styles.warningWrapper}>
				<View style={[styles.warningTextWrapper, hideError ? styles.invisible : null]}>
					<Text style={styles.warningText}>{gasErrorMessage}</Text>
				</View>
			</View>
		);
	};

	render = () => {
		if (this.state.ready) {
			const { advancedCustomGas, warningGasLimit, warningGasPrice, warningSufficientFunds } = this.state;
			const { review, gasError } = this.props;
			const disableButton = advancedCustomGas
				? !!warningGasLimit || !!warningGasPrice || !!warningSufficientFunds || !!gasError
				: false;
			return (
				<View style={styles.root}>
					<View style={styles.customGasHeader}>
						<TouchableOpacity onPress={review}>
							<IonicIcon name={'ios-arrow-back'} size={24} color={colors.black} />
						</TouchableOpacity>
						<Text style={styles.customGasModalTitleText}>{strings('transaction.edit_network_fee')}</Text>
						<IonicIcon name={'ios-arrow-back'} size={24} color={colors.white} />
					</View>
					<View style={styles.optionsContainer}>
						<TouchableOpacity
							style={[styles.basicButton, advancedCustomGas ? null : styles.optionSelected]}
							onPress={this.toggleAdvancedOptions}
						>
							<Text style={styles.textOptions}>{strings('custom_gas.basic_options')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.basicButton, advancedCustomGas ? styles.optionSelected : null]}
							onPress={this.toggleAdvancedOptions}
						>
							<Text style={styles.textOptions}>{strings('custom_gas.advanced_options')}</Text>
						</TouchableOpacity>
					</View>

					{advancedCustomGas ? this.renderCustomGasInput() : this.renderCustomGasSelector()}
					{!advancedCustomGas ? (
						<Text style={styles.message}>{strings('custom_gas.cost_explanation')}</Text>
					) : null}
					{advancedCustomGas ? this.renderGasError() : null}
					<View style={styles.footerContainer}>
						<StyledButton
							disabled={disableButton}
							type={'confirm'}
							containerStyle={styles.buttonNext}
							onPress={this.saveCustomGasSelection}
							testID={'custom-gas-save-button'}
						>
							{strings('custom_gas.save')}
						</StyledButton>
					</View>
				</View>
			);
		}
		return (
			<View style={styles.loaderContainer}>
				<ActivityIndicator size="small" />
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: getNormalizedTxState(state)
});

export default connect(mapStateToProps)(CustomGas);
