import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { colors } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import {
	renderFromWei,
	hexToBN,
	renderFromTokenMinimalUnit,
	fromTokenMinimalUnit,
	balanceToFiat,
	toBN,
	isBN,
	balanceToFiatNumber,
	renderToGwei,
	weiToFiatNumber
} from '../../../../util/number';
import { getActionKey, decodeTransferData, isCollectibleAddress } from '../../../../util/transactions';
import { renderFullAddress, safeToChecksumAddress } from '../../../../util/address';

const styles = StyleSheet.create({
	row: {
		backgroundColor: colors.white,
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	},
	rowContent: {
		padding: 0
	}
});

/**
 * View that renders a transfer transaction item, part of transactions list
 */
export default class TransferElement extends PureComponent {
	static propTypes = {
		/**
		 * Transaction object
		 */
		tx: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Callback function that will adjust the scroll
		 * position once the transaction detail is visible
		 */
		selected: PropTypes.bool,
		/**
		 * String of selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Callback to render transaction details view
		 */
		onPressItem: PropTypes.func,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.object,
		/**
		 * Current element of the list index
		 */
		i: PropTypes.number,
		/**
		 * Callback to render corresponding transaction element
		 */
		renderTxElement: PropTypes.func,
		/**
		 * Callback to render corresponding transaction element
		 */
		renderTxDetails: PropTypes.func,
		/**
		 * An array that represents the user collectible contracts
		 */
		collectibleContracts: PropTypes.array
	};

	state = {
		actionKey: undefined,
		addressTo: '',
		encodedAmount: '',
		isCollectible: false
	};

	mounted = false;

	componentDidMount = async () => {
		this.mounted = true;
		const {
			tx,
			tx: {
				transaction: { data, to }
			},
			selectedAddress
		} = this.props;
		const actionKey = await getActionKey(tx, selectedAddress);
		const [addressTo, encodedAmount] = decodeTransferData('transfer', data);
		const isCollectible = await isCollectibleAddress(to, encodedAmount);
		this.mounted && this.setState({ actionKey, addressTo, encodedAmount, isCollectible });
	};

	componentWillUnmount() {
		this.mounted = false;
	}

	onPressItem = () => {
		const { tx, i, onPressItem } = this.props;
		onPressItem(tx.id, i);
	};

	getTokenTransfer = totalGas => {
		const {
			tx: {
				transaction: { to }
			},
			conversionRate,
			currentCurrency,
			tokens,
			contractExchangeRates
		} = this.props;

		const { actionKey, encodedAmount } = this.state;

		const amount = toBN(encodedAmount);

		const userHasToken = safeToChecksumAddress(to) in tokens;
		const token = userHasToken ? tokens[safeToChecksumAddress(to)] : null;
		const renderActionKey = token ? strings('transactions.sent') + ' ' + token.symbol : actionKey;
		const renderTokenAmount = token
			? renderFromTokenMinimalUnit(amount, token.decimals) + ' ' + token.symbol
			: undefined;
		const exchangeRate = token ? contractExchangeRates[token.address] : undefined;
		let renderTokenFiatAmount, renderTokenFiatNumber;
		if (exchangeRate) {
			renderTokenFiatAmount =
				'- ' +
				balanceToFiat(
					fromTokenMinimalUnit(amount, token.decimals) || 0,
					conversionRate,
					exchangeRate,
					currentCurrency
				).toUpperCase();
			renderTokenFiatNumber = balanceToFiatNumber(
				fromTokenMinimalUnit(amount, token.decimals) || 0,
				conversionRate,
				exchangeRate
			);
		}

		const renderToken = token
			? renderFromTokenMinimalUnit(amount, token.decimals) + ' ' + token.symbol
			: strings('transaction.value_not_available');
		const totalFiatNumber = renderTokenFiatNumber
			? weiToFiatNumber(totalGas, conversionRate) + renderTokenFiatNumber
			: undefined;

		const transactionDetails = {
			renderValue: renderToken,
			renderTotalValue: `${renderToken} ${strings('unit.divisor')} ${renderFromWei(totalGas)} ${strings(
				'unit.eth'
			)}`,
			renderTotalValueFiat: totalFiatNumber ? `${totalFiatNumber} ${currentCurrency}` : undefined
		};

		const transactionElement = {
			actionKey: renderActionKey,
			value: !renderTokenAmount ? strings('transaction.value_not_available') : renderTokenAmount,
			fiatValue: renderTokenFiatAmount
		};

		return [transactionElement, transactionDetails];
	};

	getCollectibleTransfer = totalGas => {
		const {
			tx: {
				transaction: { to }
			},
			collectibleContracts
		} = this.props;
		const { encodedAmount } = this.state;
		let actionKey;
		const tokenId = encodedAmount;
		const collectible = collectibleContracts.find(
			collectible => collectible.address.toLowerCase() === to.toLowerCase()
		);
		if (collectible) {
			actionKey = strings('transactions.sent') + ' ' + collectible.name;
		} else {
			actionKey = strings('transactions.sent_collectible');
		}

		const renderCollectible = collectible
			? strings('unit.token_id') + tokenId + ' ' + collectible.symbol
			: strings('unit.token_id') + tokenId;

		const transactionDetails = {
			renderValue: renderCollectible,
			renderTotalValue:
				renderCollectible +
				' ' +
				strings('unit.divisor') +
				' ' +
				renderFromWei(totalGas) +
				' ' +
				strings('unit.eth'),
			renderTotalValueFiat: undefined
		};

		const transactionElement = {
			actionKey,
			value: `${strings('unit.token_id')}${tokenId}`,
			fiatValue: collectible ? collectible.symbol : undefined
		};

		return [transactionElement, transactionDetails];
	};

	render = () => {
		const {
			selected,
			tx,
			tx: {
				transaction: { from, gas, gasPrice },
				transactionHash
			}
		} = this.props;
		const { addressTo } = this.state;
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const renderGas = parseInt(gas, 16).toString();
		const renderGasPrice = renderToGwei(gasPrice);

		let [transactionElement, transactionDetails] = this.state.isCollectible
			? this.getCollectibleTransfer(totalGas)
			: this.getTokenTransfer(totalGas);
		transactionElement = { ...transactionElement, renderTo: addressTo };
		transactionDetails = {
			...transactionDetails,
			...{
				renderFrom: renderFullAddress(from),
				renderTo: renderFullAddress(addressTo),
				transactionHash,
				renderGas,
				renderGasPrice
			}
		};
		return (
			<TouchableOpacity style={styles.row} onPress={this.onPressItem}>
				<View style={styles.rowContent}>
					{this.props.renderTxElement(transactionElement)}
					{this.props.renderTxDetails(selected, tx, transactionDetails)}
				</View>
			</TouchableOpacity>
		);
	};
}
