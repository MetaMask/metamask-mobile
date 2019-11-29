import React, { PureComponent } from 'react';
import { colors, baseStyles, fontStyles } from '../../../../styles/common';
import { StyleSheet, SafeAreaView, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { connect } from 'react-redux';
import { getSendFlowTitle } from '../../../UI/Navbar';
import { AddressFrom, AddressTo } from '../AddressInputs';
import PropTypes from 'prop-types';
import {
	renderFromWei,
	renderFromTokenMinimalUnit,
	weiToFiat,
	balanceToFiat,
	weiToFiatNumber,
	balanceToFiatNumber,
	renderFiatAddition
} from '../../../../util/number';
import { getTicker, decodeTransferData } from '../../../../util/transactions';
import StyledButton from '../../../UI/StyledButton';
import { hexToBN } from 'gaba/dist/util';
import { prepareTransaction } from '../../../../actions/newTransaction';
import { fetchBasicGasEstimates, apiEstimateModifiedToWEI } from '../../../../util/custom-gas';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import ActionModal from '../../../UI/ActionModal';
import CustomGas from '../CustomGas';

const AVERAGE_GAS = 20;
const LOW_GAS = 10;
const FAST_GAS = 40;

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	inputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	},
	amountWrapper: {
		flexDirection: 'column',
		margin: 24
	},
	textAmountLabel: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.grey500,
		textTransform: 'uppercase',
		marginVertical: 3
	},
	textAmount: {
		...fontStyles.light,
		fontSize: 44,
		textAlign: 'center'
	},
	summaryWrapper: {
		flexDirection: 'column',
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		padding: 16,
		marginHorizontal: 24
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 6
	},
	totalCryptoRow: {
		alignItems: 'flex-end',
		marginTop: 8
	},
	textSummary: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12
	},
	textSummaryAmount: {
		textTransform: 'uppercase'
	},
	textCrypto: {
		...fontStyles.normal,
		textAlign: 'right',
		fontSize: 12,
		textTransform: 'uppercase',
		color: colors.grey500
	},
	textBold: {
		...fontStyles.bold,
		alignSelf: 'flex-end'
	},
	separator: {
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		marginVertical: 6
	},
	buttonNext: {
		flex: 1,
		marginHorizontal: 24,
		alignSelf: 'flex-end'
	},
	buttonNextWrapper: {
		flex: 0.1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	actionTouchable: {
		padding: 16
	},
	actionText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 16,
		alignSelf: 'center'
	},
	actionsWrapper: {
		margin: 24
	},
	loader: {
		backgroundColor: colors.white,
		height: 10
	},
	customGasModalTitle: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		fontSize: 18,
		alignSelf: 'center',
		margin: 16
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Confirm extends PureComponent {
	static navigationOptions = ({ navigation }) => getSendFlowTitle('send.confirm', navigation);

	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Object containing token balances in the format address => balance
		 */
		contractBalances: PropTypes.object,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Current transaction state
		 */
		transactionState: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		prepareTransaction: PropTypes.func
	};

	state = {
		customGasModalVisible: false,
		gasEstimationReady: false,
		customGas: undefined,
		customGasPrice: undefined,
		fromAccountBalance: undefined,
		transactionValue: undefined,
		transactionValueFiat: undefined,
		transactionFee: undefined,
		transactionTotalAmount: undefined,
		transactionTotalAmountFiat: undefined
	};

	componentDidMount = async () => {
		this.parseTransactionData();
		this.prepareTransaction();
	};

	parseTransactionData = () => {
		const {
			accounts,
			contractBalances,
			contractExchangeRates,
			conversionRate,
			currentCurrency,
			transactionState: {
				selectedAsset,
				transactionTo: to,
				transaction: { from, value, gas, gasPrice, data }
			},
			ticker
		} = this.props;

		const weiTransactionFee = gas && gas.mul(gasPrice);
		const valueBN = hexToBN(value);
		const transactionFeeFiat = weiToFiat(weiTransactionFee, conversionRate, currentCurrency);
		const parsedTicker = getTicker(ticker);

		if (selectedAsset.isEth) {
			const fromAccountBalance = `${renderFromWei(accounts[from].balance)} ${parsedTicker}`;
			const transactionValue = `${renderFromWei(value)} ${parsedTicker}`;
			const transactionValueFiat = weiToFiat(valueBN, conversionRate, currentCurrency);
			const transactionTotalAmountBN = weiTransactionFee && weiTransactionFee.add(valueBN);
			const transactionTotalAmount = `${renderFromWei(transactionTotalAmountBN)} ${parsedTicker}`;
			const transactionTotalAmountFiat = weiToFiat(transactionTotalAmountBN, conversionRate, currentCurrency);

			this.setState({
				fromAccountBalance,
				transactionValue,
				transactionValueFiat,
				transactionFeeFiat,
				transactionTo: to,
				transactionTotalAmount,
				transactionTotalAmountFiat
			});
		} else {
			// TODO check if user has token in case of confirm
			const { address, symbol = 'ERC20', decimals } = selectedAsset;
			const fromAccountBalance = `${renderFromTokenMinimalUnit(contractBalances[address], decimals)} ${symbol}`;
			const [transactionTo, , amount] = decodeTransferData('transfer', data);
			const transferValue = renderFromTokenMinimalUnit(amount, decimals);
			const transactionValue = `${transferValue} ${symbol}`;
			const exchangeRate = contractExchangeRates[address];
			const transactionFeeFiatNumber = weiToFiatNumber(weiTransactionFee, conversionRate);
			const transactionValueFiat = balanceToFiat(transferValue, conversionRate, exchangeRate, currentCurrency);
			const transactionValueFiatNumber = balanceToFiatNumber(transferValue, conversionRate, exchangeRate);
			const transactionTotalAmount = `${transactionValue} + ${renderFromWei(weiTransactionFee)} ${parsedTicker}`;
			const transactionTotalAmountFiat = renderFiatAddition(
				transactionValueFiatNumber,
				transactionFeeFiatNumber,
				currentCurrency
			);

			this.setState({
				fromAccountBalance,
				transactionValue,
				transactionValueFiat,
				transactionFeeFiat,
				transactionTo,
				transactionTotalAmount,
				transactionTotalAmountFiat
			});
		}
	};

	prepareTransaction = async () => {
		const { prepareTransaction, transactionState } = this.props;
		let transaction = transactionState.transaction;
		const estimation = await this.estimateGas(transaction);
		transaction = { ...transaction, ...estimation };
		prepareTransaction(transaction);
		this.parseTransactionData();
		this.setState({ gasEstimationReady: true });
	};

	estimateGas = async transaction => {
		const { TransactionController } = Engine.context;
		const { value, data, to, from } = transaction;
		let estimation;
		try {
			estimation = await TransactionController.estimateGas({
				value,
				from,
				data,
				to
			});
		} catch (e) {
			estimation = { gas: '0x5208' };
		}
		let basicGasEstimates;
		try {
			basicGasEstimates = await fetchBasicGasEstimates();
		} catch (error) {
			Logger.log('Error while trying to get gas limit estimates', error);
			basicGasEstimates = { average: AVERAGE_GAS, safeLow: LOW_GAS, fast: FAST_GAS };
		}
		return { gas: hexToBN(estimation.gas), gasPrice: apiEstimateModifiedToWEI(basicGasEstimates.average) };
	};

	handleGasFeeSelection = (gas, gasPrice) => {
		this.setState({ customGas: gas, customGasPrice: gasPrice });
	};

	handleSetGasFee = () => {
		this.setState({ gasEstimationReady: false });
		const { customGas, customGasPrice } = this.state;
		if (!customGas || !customGasPrice) return;
		const { prepareTransaction, transactionState } = this.props;
		let transaction = transactionState.transaction;
		transaction = { ...transaction, gas: customGas, gasPrice: customGasPrice };

		prepareTransaction(transaction);
		setTimeout(() => {
			this.parseTransactionData();
			this.setState({ customGas: undefined, customGasPrice: undefined, gasEstimationReady: true });
		}, 100);
		this.toggleCustomGasModalVisible();
	};

	toggleCustomGasModalVisible = () => {
		const { customGasModalVisible } = this.state;
		this.setState({ customGasModalVisible: !customGasModalVisible });
	};

	renderCustomGasModal = () => {
		const { customGasModalVisible } = this.state;
		const { gas, gasPrice } = this.props.transactionState.transaction;
		return (
			<ActionModal
				modalVisible={customGasModalVisible}
				confirmText={'Set'}
				cancelText={'Cancel'}
				onCancelPress={this.toggleCustomGasModalVisible}
				onRequestClose={this.toggleCustomGasModalVisible}
				onConfirmPress={this.handleSetGasFee}
				cancelButtonMode={'neutral'}
				confirmButtonMode={'confirm'}
			>
				<View style={baseStyles.flexGrow}>
					<View style={styles.customGasModalTitle}>
						<Text style={styles.customGasModalTitleText}>Transaction Fee</Text>
					</View>
					<CustomGas
						handleGasFeeSelection={this.handleGasFeeSelection}
						totalGas={gas && gas.mul(gasPrice)}
						gas={gas}
						gasPrice={gasPrice}
					/>
				</View>
			</ActionModal>
		);
	};

	renderIfGastEstimationReady = children => {
		const { gasEstimationReady } = this.state;
		return !gasEstimationReady ? (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		) : (
			children
		);
	};

	render = () => {
		const {
			transaction: { from },
			transactionToName,
			transactionFromName
		} = this.props.transactionState;
		const {
			gasEstimationReady,
			fromAccountBalance,
			transactionValue,
			transactionValueFiat,
			transactionFeeFiat,
			transactionTo,
			transactionTotalAmount,
			transactionTotalAmountFiat
		} = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.inputWrapper}>
					<AddressFrom
						onPressIcon={this.toggleFromAccountModal}
						fromAccountAddress={from}
						fromAccountName={transactionFromName}
						fromAccountBalance={fromAccountBalance}
					/>
					<AddressTo
						addressToReady
						toSelectedAddress={transactionTo}
						toAddressName={transactionToName}
						onToSelectedAddressChange={this.onToSelectedAddressChange}
					/>
				</View>
				<ScrollView style={baseStyles.flexGrow}>
					<View style={styles.amountWrapper}>
						<Text style={styles.textAmountLabel}>Amount</Text>
						<Text style={styles.textAmount}>{transactionValue}</Text>
						<Text style={styles.textAmountLabel}>{transactionValueFiat}</Text>
					</View>

					<View style={styles.summaryWrapper}>
						<View style={styles.summaryRow}>
							<Text style={styles.textSummary}>Amount</Text>
							<Text style={[styles.textSummary, styles.textSummaryAmount]}>{transactionValueFiat}</Text>
						</View>
						<View style={styles.summaryRow}>
							<Text style={styles.textSummary}>Transaction fee</Text>
							{this.renderIfGastEstimationReady(
								<Text style={[styles.textSummary, styles.textSummaryAmount]}>{transactionFeeFiat}</Text>
							)}
						</View>
						<View style={styles.separator} />
						<View style={styles.summaryRow}>
							<Text style={[styles.textSummary, styles.textBold]}>Total amount</Text>
							{this.renderIfGastEstimationReady(
								<Text style={[styles.textSummary, styles.textSummaryAmount, styles.textBold]}>
									{transactionTotalAmountFiat}
								</Text>
							)}
						</View>
						<View style={styles.totalCryptoRow}>
							{this.renderIfGastEstimationReady(
								<Text style={[styles.textSummary, styles.textCrypto]}>{transactionTotalAmount}</Text>
							)}
						</View>
					</View>
					<View style={styles.actionsWrapper}>
						<TouchableOpacity style={styles.actionTouchable} onPress={this.toggleCustomGasModalVisible}>
							<Text style={styles.actionText}>Adjust transaction fee</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.actionTouchable}>
							<Text style={styles.actionText}>Hex data</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
				<View style={styles.buttonNextWrapper}>
					<StyledButton
						type={'confirm'}
						disabled={!gasEstimationReady}
						containerStyle={styles.buttonNext}
						onPress={this.onNext}
					>
						Send
					</StyledButton>
				</View>
				{this.renderCustomGasModal()}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transactionState: state.newTransaction
});

const mapDispatchToProps = dispatch => ({
	prepareTransaction: transaction => dispatch(prepareTransaction(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Confirm);
