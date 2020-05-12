import React, { PureComponent } from 'react';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
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

const styles = StyleSheet.create({
	overview: {
		paddingHorizontal: 24,
		borderTopWidth: 1,
		borderColor: colors.grey200
	},
	overviewRow: {
		alignItems: 'center',
		flexDirection: 'row',
		paddingVertical: 15
	},
	overviewAlert: {
		alignItems: 'center',
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 4,
		borderWidth: 1,
		flexDirection: 'row',
		height: 32,
		paddingHorizontal: 16
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
	topOverviewRow: {
		borderBottomWidth: 1,
		borderColor: colors.grey200
	},
	overviewLabel: {
		...fontStyles.bold,
		color: colors.grey500,
		flex: 1,
		fontSize: 12,
		minWidth: 30,
		textTransform: 'uppercase'
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
		color: colors.grey500,
		fontSize: 16,
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	overviewInfo: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 12,
		marginBottom: 6,
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
		ticker: PropTypes.string
	};

	state = {
		toFocused: false,
		amountError: '',
		actionKey: strings('transactions.tx_review_confirm'),
		totalGas: undefined,
		totalGasFiat: undefined,
		totalGasEth: undefined,
		totalFiat: undefined,
		totalValue: undefined
	};

	componentDidMount = () => {
		const {
			transaction: { gas, gasPrice },
			currentCurrency,
			conversionRate,
			ticker
		} = this.props;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const totalGasFiat = weiToFiat(totalGas, conversionRate, currentCurrency);
		const totalGasEth = `${renderFromWei(totalGas)} ${getTicker(ticker)}`;

		const [totalFiat, totalValue] = this.getRenderTotals(totalGas, totalGasFiat)();
		this.setState({ totalGas, totalGasFiat, totalGasEth, totalFiat, totalValue });
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
				const totalFiat = weiToFiat(totalEth, conversionRate, currentCurrency);
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
		const { amountError, totalGasFiat, totalGasEth, totalFiat, totalValue } = this.state;
		const gasPrimary = totalGasFiat || totalGasEth;
		const gasSeconday = totalGasFiat ? totalGasEth : null;

		return (
			<View style={styles.overview}>
				<View style={[styles.overviewRow, styles.topOverviewRow]}>
					<Text style={styles.overviewLabel}>{strings('transaction.gas_fee')}</Text>
					<View style={styles.overviewContent}>
						<Text style={styles.overviewPrimary}>{gasPrimary}</Text>
						{!!gasSeconday && <Text style={styles.overviewEth}>{totalGasEth}</Text>}
					</View>
				</View>

				<View style={styles.overviewRow}>
					<Text style={styles.overviewLabel}>{strings('transaction.total')}</Text>
					<View style={styles.overviewContent}>
						<Text style={styles.overviewInfo}>
							{`${strings('transaction.amount')} + ${strings('transaction.gas_fee')}`}
						</Text>
						{!!totalFiat && (
							<Text style={[styles.overviewPrimary, styles.overviewAccent]}>{totalFiat}</Text>
						)}
						{totalValue}
					</View>
				</View>

				{!!amountError && (
					<View style={styles.overviewAlert}>
						<MaterialIcon name={'error'} size={20} style={styles.overviewAlertIcon} />
						<Text style={styles.overviewAlertText}>
							{strings('transaction.alert')}: {amountError}.
						</Text>
					</View>
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	transaction: getNormalizedTxState(state),
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});

export default connect(mapStateToProps)(TransactionReviewInformation);
