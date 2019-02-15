import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { toLocaleDateTime } from '../../util/date';
import {
	renderFromWei,
	weiToFiat,
	hexToBN,
	renderFromTokenMinimalUnit,
	fromTokenMinimalUnit,
	balanceToFiat,
	toBN,
	isBN,
	balanceToFiatNumber,
	toGwei,
	weiToFiatNumber
} from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import Identicon from '../Identicon';
import { getActionKey, decodeTransferData } from '../../util/transactions';
import TransactionDetails from './TransactionDetails';

const styles = StyleSheet.create({
	row: {
		backgroundColor: colors.white,
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	rowContent: {
		padding: 0
	},
	rowOnly: {
		padding: 15,
		height: 90
	},
	date: {
		color: colors.fontSecondary,
		fontSize: 12,
		marginBottom: 10,
		...fontStyles.normal
	},
	info: {
		marginLeft: 15
	},
	address: {
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	status: {
		marginTop: 5,
		paddingVertical: 3,
		paddingHorizontal: 5,
		textAlign: 'center',
		backgroundColor: colors.concrete,
		color: colors.gray,
		fontSize: 9,
		letterSpacing: 0.5,
		width: 75,
		...fontStyles.bold
	},
	amount: {
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	amountFiat: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	amounts: {
		flex: 1,
		alignItems: 'flex-end'
	},
	subRow: {
		flexDirection: 'row'
	},
	statusConfirmed: {
		backgroundColor: colors.lightSuccess,
		color: colors.success
	},
	statusSubmitted: {
		backgroundColor: colors.lightWarning,
		color: colors.warning
	},
	statusFailed: {
		backgroundColor: colors.lightRed,
		color: colors.error
	},
	ethLogo: {
		width: 24,
		height: 24
	}
});

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that renders a transaction item part of transactions list
 */
export default class TransactionElement extends PureComponent {
	static propTypes = {
		/**
		 * Asset object (in this case ERC721 token)
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
		 * Current element of the list index
		 */
		i: PropTypes.number,
		/**
		 * Callback to render transaction details view
		 */
		onPressItem: PropTypes.func,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.object,
		/**
		 * An array that represents the user collectible contracts
		 */
		collectibleContracts: PropTypes.array,
		/**
		 * Boolean to determine if this network supports a block explorer
		 */
		blockExplorer: PropTypes.bool,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func.isRequired,
		/**
		 * Action that shows the global alert
		 */
		viewOnEtherscan: PropTypes.func.isRequired
	};

	state = {
		actionKey: undefined
	};

	mounted = false;

	componentDidMount = async () => {
		this.mounted = true;
		const { tx, selectedAddress } = this.props;
		const actionKey = await getActionKey(tx, selectedAddress);
		this.mounted && this.setState({ actionKey });
	};

	componentWillUnmount() {
		this.mounted = false;
	}

	getStatusStyle(status) {
		if (status === 'confirmed') {
			return styles.statusConfirmed;
		} else if (status === 'submitted' || status === 'approved') {
			return styles.statusSubmitted;
		} else if (status === 'failed') {
			return styles.statusFailed;
		}
		return null;
	}

	onPressItem = () => {
		const { tx, i, onPressItem } = this.props;
		onPressItem(tx.id, i);
	};

	renderTxTime = () => {
		const { tx, selectedAddress } = this.props;
		const incoming = toChecksumAddress(tx.transaction.to) === selectedAddress;
		const selfSent = incoming && toChecksumAddress(tx.transaction.from) === selectedAddress;
		return (
			<Text style={styles.date}>
				{(!incoming || selfSent) && `#${hexToBN(tx.transaction.nonce).toString()}  - `}
				{`${toLocaleDateTime(tx.time)}`}
			</Text>
		);
	};

	renderTxDetails = (selected, tx, transactionDetails) => {
		const { showAlert, blockExplorer } = this.props;
		return selected ? (
			<TransactionDetails
				transactionObject={tx}
				blockExplorer={blockExplorer}
				showAlert={showAlert}
				viewOnEtherscan={this.props.viewOnEtherscan}
				transactionDetails={transactionDetails}
			/>
		) : null;
	};

	/**
	 * Renders an horizontal bar with basic tx information
	 *
	 * @param {string} addressTo - Transaction to address
	 * @param {string} actionKey - Transaction action key
	 * @param {string} value - Transaction crypto value (ETH, assets ERC20 and ERC721)
	 * @param {string} fiatValue - transaction fiat crypto value, if available
	 * @param {bool} contractDeployment - Whether the transaction corresponds to a contract deployment
	 */
	renderTxElement = (addressTo, actionKey, value, fiatValue, contractDeployment = false) => {
		const {
			tx: { status }
		} = this.props;
		return (
			<View style={styles.rowOnly}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					{contractDeployment ? (
						<Image source={ethLogo} style={styles.ethLogo} />
					) : (
						<Identicon address={addressTo} diameter={24} />
					)}
					<View style={styles.info}>
						<Text style={styles.address}>{actionKey}</Text>
						<Text style={[styles.status, this.getStatusStyle(status)]}>{status.toUpperCase()}</Text>
					</View>
					<View style={styles.amounts}>
						<Text style={styles.amount}>{value}</Text>
						<Text style={styles.amountFiat}>{fiatValue}</Text>
					</View>
				</View>
			</View>
		);
	};

	renderTransferElement = () => {
		const {
			tx,
			tx: {
				transaction: { gas, gasPrice }
			},
			conversionRate,
			currentCurrency,
			tokens,
			contractExchangeRates,
			selected
		} = this.props;
		const { actionKey } = this.state;
		const [addressTo, amount] = decodeTransferData('ERC20', tx.transaction.data);
		const userHasToken = toChecksumAddress(tx.transaction.to) in tokens;
		const token = userHasToken ? tokens[toChecksumAddress(tx.transaction.to)] : null;
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
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const renderToken = token
			? renderFromTokenMinimalUnit(amount, token.decimals) + ' ' + token.symbol
			: strings('transaction.value_not_available');
		const totalFiatNumber = renderTokenFiatNumber
			? weiToFiatNumber(totalGas, conversionRate) + renderTokenFiatNumber
			: undefined;
		const transactionDetails = {
			renderFrom: tx.transaction.from,
			renderTo: addressTo,
			transactionHash: tx.transaction.hash,
			renderValue: renderToken,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: toGwei(gasPrice),
			renderTotalValue:
				renderToken + ' ' + strings('unit.divisor') + ' ' + renderFromWei(totalGas) + ' ' + strings('unit.eth'),
			renderTotalValueFiat: totalFiatNumber ? totalFiatNumber + ' ' + currentCurrency.toUpperCase() : undefined
		};

		return (
			<View style={styles.rowContent}>
				{this.renderTxElement(
					addressTo,
					renderActionKey,
					!renderTokenAmount ? strings('transaction.value_not_available') : renderTokenAmount,
					renderTokenFiatAmount
				)}
				{this.renderTxDetails(selected, tx, transactionDetails)}
			</View>
		);
	};

	renderTransferFromElement = () => {
		const {
			tx,
			tx: {
				transaction: { gas, gasPrice }
			},
			selected,
			collectibleContracts
		} = this.props;
		let { actionKey } = this.state;
		const [addressFrom, addressTo, tokenId] = decodeTransferData('ERC721', tx.transaction.data);
		const collectible = collectibleContracts.find(
			collectible => collectible.address.toLowerCase() === tx.transaction.to.toLowerCase()
		);
		if (collectible) {
			actionKey = strings('transactions.sent') + ' ' + collectible.name;
		}

		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const renderCollectible = '#' + tokenId + ' ' + (collectible ? collectible.symbol : undefined);

		const transactionDetails = {
			renderFrom: addressFrom,
			renderTo: addressTo,
			transactionHash: tx.transaction.hash,
			renderValue: renderCollectible,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: toGwei(gasPrice),
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

		return (
			<View style={styles.rowContent}>
				{this.renderTxElement(
					addressTo,
					actionKey,
					`#${tokenId}`,
					collectible ? collectible.symbol : undefined
				)}
				{this.renderTxDetails(selected, tx, transactionDetails)}
			</View>
		);
	};

	renderConfirmElement = () => {
		const {
			tx,
			tx: {
				transaction: { value, gas, gasPrice }
			},
			conversionRate,
			currentCurrency,
			selected
		} = this.props;
		const { actionKey } = this.state;
		const totalEth = hexToBN(value);
		const renderTotalEth = renderFromWei(totalEth) + ' ' + strings('unit.eth');
		const renderTotalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency).toUpperCase();

		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const totalValue = isBN(totalEth) ? totalEth.add(totalGas) : totalGas;

		const transactionDetails = {
			renderFrom: tx.transaction.from,
			renderTo: tx.transaction.to,
			transactionHash: tx.transaction.hash,
			renderValue: renderFromWei(value) + ' ' + strings('unit.eth'),
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: toGwei(gasPrice),
			renderTotalValue: renderFromWei(totalValue) + ' ' + strings('unit.eth'),
			renderTotalValueFiat: weiToFiat(totalValue, conversionRate, currentCurrency).toUpperCase()
		};

		return (
			<View style={styles.rowContent}>
				{this.renderTxElement(tx.transaction.to, actionKey, renderTotalEth, renderTotalEthFiat)}
				{this.renderTxDetails(selected, tx, transactionDetails)}
			</View>
		);
	};

	renderDeploymentElement = () => {
		const {
			tx,
			tx: {
				transaction: { value, gas, gasPrice }
			},
			selected,
			conversionRate,
			currentCurrency
		} = this.props;
		const { actionKey } = this.state;
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');

		const renderTotalEth = renderFromWei(totalGas) + ' ' + strings('unit.eth');
		const renderTotalEthFiat = weiToFiat(totalGas, conversionRate, currentCurrency).toUpperCase();
		const totalEth = isBN(value) ? value.add(totalGas) : totalGas;

		const transactionDetails = {
			renderFrom: tx.transaction.from,
			renderTo: strings('transactions.to_contract'),
			transactionHash: tx.transaction.hash,
			renderValue: renderFromWei(value) + ' ' + strings('unit.eth'),
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: toGwei(gasPrice),
			renderTotalValue: renderFromWei(totalEth) + ' ' + strings('unit.eth'),
			renderTotalValueFiat: weiToFiat(totalEth, conversionRate, currentCurrency).toUpperCase()
		};

		return (
			<View style={styles.rowContent}>
				{this.renderTxElement(tx.transaction.to, actionKey, renderTotalEth, renderTotalEthFiat, true)}
				{this.renderTxDetails(selected, tx, transactionDetails)}
			</View>
		);
	};

	render = () => {
		const {
			tx: {
				transaction: { gas, gasPrice }
			}
		} = this.props;
		const { actionKey } = this.state;
		let transactionElement;
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');

		switch (actionKey) {
			case strings('transactions.sent_tokens'):
				transactionElement = this.renderTransferElement(totalGas);
				break;
			case strings('transactions.sent_collectible'):
				transactionElement = this.renderTransferFromElement(totalGas);
				break;
			case strings('transactions.contract_deploy'):
				transactionElement = this.renderDeploymentElement(totalGas);
				break;
			default:
				transactionElement = this.renderConfirmElement(totalGas);
		}

		return (
			<TouchableOpacity
				style={styles.row}
				onPress={this.onPressItem} // eslint-disable-line react/jsx-no-bind
			>
				{transactionElement}
			</TouchableOpacity>
		);
	};
}
