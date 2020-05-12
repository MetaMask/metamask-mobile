import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import {
	weiToFiat,
	balanceToFiat,
	renderFromTokenMinimalUnit,
	renderFromWei,
	fromTokenMinimalUnit
} from '../../../../util/number';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import { connect } from 'react-redux';
import {
	APPROVE_FUNCTION_SIGNATURE,
	decodeTransferData,
	getTicker,
	getNormalizedTxState
} from '../../../../util/transactions';
import contractMap from 'eth-contract-metadata';
import WarningMessage from '../../../Views/SendFlow/WarningMessage';
import { safeToChecksumAddress } from '../../../../util/address';

const styles = StyleSheet.create({
	confirmBadge: {
		...fontStyles.normal,
		alignItems: 'center',
		borderColor: colors.grey400,
		borderRadius: 12,
		borderWidth: 1,
		color: colors.black,
		fontSize: 10,
		paddingVertical: 4,
		paddingHorizontal: 8,
		textAlign: 'center'
	},
	summary: {
		backgroundColor: colors.beige,
		padding: 24,
		paddingTop: 12,
		paddingBottom: 16,
		alignItems: 'center'
	},
	summaryFiat: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 44,
		paddingTop: 16,
		paddingBottom: 4,
		textTransform: 'uppercase',
		textAlign: 'center'
	},
	summaryEth: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 24,
		textTransform: 'uppercase',
		textAlign: 'center'
	},
	warning: {
		width: '100%',
		paddingHorizontal: 24,
		paddingTop: 12
	}
});

/**
 * PureComponent that supports reviewing transaction summary
 */
class TransactionReviewSummary extends PureComponent {
	static propTypes = {
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
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
		/**
		 * Transaction corresponding action key
		 */
		actionKey: PropTypes.string,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		assetAmount: undefined,
		conversionRate: undefined,
		fiatValue: undefined
	};

	componentDidMount = () => {
		const {
			transaction: { data, to },
			tokens
		} = this.props;
		let assetAmount, conversionRate, fiatValue;
		const approveTransaction = data && data.substr(0, 10) === APPROVE_FUNCTION_SIGNATURE;
		if (approveTransaction) {
			let contract = contractMap[safeToChecksumAddress(to)];
			if (!contract) {
				contract = tokens.find(({ address }) => address === safeToChecksumAddress(to));
			}
			const symbol = (contract && contract.symbol) || 'ERC20';
			assetAmount = `${decodeTransferData('transfer', data)[1]} ${symbol}`;
		} else {
			[assetAmount, conversionRate, fiatValue] = this.getRenderValues()();
		}
		this.setState({ assetAmount, conversionRate, fiatValue, approveTransaction });
	};

	getRenderValues = () => {
		const {
			transaction: { value, selectedAsset, assetType },
			currentCurrency,
			contractExchangeRates,
			ticker
		} = this.props;
		const values = {
			ETH: () => {
				const assetAmount = `${renderFromWei(value)} ${getTicker(ticker)}`;
				const conversionRate = this.props.conversionRate;
				const fiatValue = weiToFiat(value, conversionRate, currentCurrency);
				return [assetAmount, conversionRate, fiatValue];
			},
			ERC20: () => {
				const assetAmount = `${renderFromTokenMinimalUnit(value, selectedAsset.decimals)} ${
					selectedAsset.symbol
				}`;
				const conversionRate = contractExchangeRates[selectedAsset.address];
				const fiatValue = balanceToFiat(
					(value && fromTokenMinimalUnit(value, selectedAsset.decimals)) || 0,
					this.props.conversionRate,
					conversionRate,
					currentCurrency
				);
				return [assetAmount, conversionRate, fiatValue];
			},
			ERC721: () => {
				const assetAmount = strings('unit.token_id') + selectedAsset.tokenId;
				const conversionRate = true;
				const fiatValue = selectedAsset.name;
				return [assetAmount, conversionRate, fiatValue];
			},
			default: () => [undefined, undefined, undefined]
		};
		return values[assetType] || values.default;
	};

	renderWarning = () => <Text>{`${strings('transaction.approve_warning')} ${this.state.assetAmount}`}</Text>;

	render = () => {
		const { actionKey } = this.props;
		const { assetAmount, conversionRate, fiatValue, approveTransaction } = this.state;
		return (
			<View>
				{!!approveTransaction && (
					<View style={styles.warning}>
						<WarningMessage warningMessage={this.renderWarning()} />
					</View>
				)}
				<View style={styles.summary}>
					<Text style={styles.confirmBadge} numberOfLines={1}>
						{actionKey}
					</Text>

					{!conversionRate ? (
						<Text style={styles.summaryFiat}>{assetAmount}</Text>
					) : (
						<View>
							<Text style={styles.summaryFiat}>{fiatValue}</Text>
							<Text style={styles.summaryEth}>{assetAmount}</Text>
						</View>
					)}
				</View>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	transaction: getNormalizedTxState(state),
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});

export default connect(mapStateToProps)(TransactionReviewSummary);
