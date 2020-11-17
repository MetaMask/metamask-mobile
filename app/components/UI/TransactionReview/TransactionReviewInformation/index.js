import React, { PureComponent } from 'react';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { connect } from 'react-redux';
import {
	toBN,
	isBN,
	weiToFiat,
	weiToFiatNumber,
	balanceToFiatNumber,
	renderFromTokenMinimalUnit,
	renderFromWei
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import { getTicker, getNormalizedTxState } from '../../../../util/transactions';
import TransactionReviewFeeCard from '../TransactionReviewFeeCard';

const styles = StyleSheet.create({
	overviewAlert: {
		alignItems: 'center',
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 4,
		borderWidth: 1,
		flexDirection: 'row',
		height: 32,
		paddingHorizontal: 16,
		marginHorizontal: 24,
		marginTop: 12
	},
	overviewAlertText: {
		...fontStyles.normal,
		color: colors.red,
		flex: 1,
		fontSize: 12,
		marginLeft: 8
	},
	overviewAlertIcon: {
		color: colors.red,
		flex: 0
	},
	overviewPrimary: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 24,
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	overviewAccent: {
		color: colors.blue
	},
	overviewEth: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 14,
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	assetName: {
		maxWidth: 200
	},
	totalValue: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	collectibleName: {
		maxWidth: '30%'
	},
	viewDataWrapper: {
		flex: 1,
		marginTop: 16
	},
	viewDataButton: {
		alignSelf: 'center'
	},
	viewDataText: {
		color: colors.blue,
		textAlign: 'center',
		fontSize: 12,
		...fontStyles.bold,
		alignSelf: 'center'
	}
});

/**
 * PureComponent that supports reviewing a transaction information
 */
class TransactionReviewInformation extends PureComponent {
	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Callback for transaction edition
		 */
		edit: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Transaction amount in selected asset before gas
		 */
		assetAmount: PropTypes.string,
		/**
		 * Transaction amount in fiat before gas
		 */
		fiatValue: PropTypes.string,
		/**
		 * ETH or fiat, depending on user setting
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Hides or shows transaction data
		 */
		toggleDataView: PropTypes.func,
		/**
		 * Whether or not basic gas estimates have been fetched
		 */
		ready: PropTypes.bool
	};

	state = {
		toFocused: false,
		amountError: '',
		actionKey: strings('transactions.tx_review_confirm')
	};

	getTotalFiat = (asset, totalGas, conversionRate, exchangeRate, currentCurrency, amountToken) => {
		let total = 0;
		const gasFeeFiat = weiToFiatNumber(totalGas, conversionRate);
		const balanceFiat = balanceToFiatNumber(parseFloat(amountToken), conversionRate, exchangeRate);
		const base = Math.pow(10, 5);
		total = ((parseFloat(gasFeeFiat) + parseFloat(balanceFiat)) * base) / base;
		return `${total} ${currentCurrency}`;
	};

	edit = () => {
		const { edit } = this.props;
		edit && edit();
	};

	getRenderTotals = (totalGas, totalGasFiat) => {
		const {
			transaction: { value, selectedAsset, assetType },
			currentCurrency,
			conversionRate,
			contractExchangeRates,
			ticker
		} = this.props;

		const totals = {
			ETH: () => {
				const totalEth = isBN(value) ? value.add(totalGas) : totalGas;
				const totalFiat = (
					<Text style={styles.overviewEth}>{weiToFiat(totalEth, conversionRate, currentCurrency)}</Text>
				);
				const totalValue = (
					<Text
						style={totalFiat ? styles.overviewEth : [styles.overviewPrimary, styles.overviewAccent]}
					>{`${renderFromWei(totalEth)} ${getTicker(ticker)} `}</Text>
				);
				return [totalFiat, totalValue];
			},
			ERC20: () => {
				const amountToken = renderFromTokenMinimalUnit(value, selectedAsset.decimals);
				const conversionRateAsset = contractExchangeRates[selectedAsset.address];
				const totalFiat = this.getTotalFiat(
					selectedAsset,
					totalGas,
					conversionRate,
					conversionRateAsset,
					currentCurrency,
					amountToken
				);
				const totalValue = (
					<View style={styles.totalValue}>
						<Text numberOfLines={1} style={[styles.overviewEth, styles.assetName]}>
							{amountToken + ' ' + selectedAsset.symbol}
						</Text>
						<Text
							style={totalFiat ? styles.overviewEth : [styles.overviewPrimary, styles.overviewAccent]}
						>{` + ${renderFromWei(totalGas)} ${getTicker(ticker)}`}</Text>
					</View>
				);
				return [totalFiat, totalValue];
			},
			ERC721: () => {
				const totalFiat = totalGasFiat;
				const totalValue = (
					<View style={styles.totalValue}>
						<Text numberOfLines={1} style={[styles.overviewEth, styles.collectibleName]}>
							{selectedAsset.name}
						</Text>
						<Text numberOfLines={1} style={styles.overviewEth}>
							{' (#' + selectedAsset.tokenId + ')'}
						</Text>
						<Text style={styles.overviewEth}>{` + ${renderFromWei(totalGas)} ${getTicker(ticker)}`}</Text>
					</View>
				);
				return [totalFiat, totalValue];
			},
			default: () => [undefined, undefined]
		};
		return totals[assetType] || totals.default;
	};

	render() {
		const { amountError } = this.state;
		const {
			fiatValue,
			assetAmount,
			primaryCurrency,
			toggleDataView,
			ready,
			transaction: { gas, gasPrice },
			currentCurrency,
			conversionRate,
			ticker
		} = this.props;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const totalGasFiat = weiToFiat(totalGas, conversionRate, currentCurrency);
		const totalGasEth = `${renderFromWei(totalGas)} ${getTicker(ticker)}`;
		const [totalFiat, totalValue] = this.getRenderTotals(totalGas, totalGasFiat)();
		return (
			<React.Fragment>
				<TransactionReviewFeeCard
					totalGasFiat={totalGasFiat}
					totalGasEth={totalGasEth}
					totalFiat={totalFiat}
					fiat={fiatValue}
					totalValue={totalValue}
					transactionValue={assetAmount}
					primaryCurrency={primaryCurrency}
					gasEstimationReady={ready}
					edit={this.edit}
				/>
				{!!amountError && (
					<View style={styles.overviewAlert}>
						<MaterialIcon name={'error'} size={20} style={styles.overviewAlertIcon} />
						<Text style={styles.overviewAlertText}>
							{strings('transaction.alert')}: {amountError}.
						</Text>
					</View>
				)}
				<View style={styles.viewDataWrapper}>
					<TouchableOpacity style={styles.viewDataButton} onPress={toggleDataView}>
						<Text style={styles.viewDataText}>{strings('transaction.view_data')}</Text>
					</TouchableOpacity>
				</View>
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	transaction: getNormalizedTxState(state),
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	primaryCurrency: state.settings.primaryCurrency
});

export default connect(mapStateToProps)(TransactionReviewInformation);
