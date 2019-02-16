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
	renderToGwei,
	weiToFiatNumber
} from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import Identicon from '../Identicon';
import { getActionKey, decodeTransferData } from '../../util/transactions';
import TransactionDetails from './TransactionDetails';
import { renderFullAddress } from '../../util/address';
import FadeIn from 'react-native-fade-in-image';

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
	 * @param {object} transactionElement - Transaction information to render, containing addressTo, actionKey, value, fiatValue, contractDeployment
	 */
	renderTxElement = transactionElement => {
		const {
			tx: { status }
		} = this.props;
		const { addressTo, actionKey, value, fiatValue, contractDeployment = false } = transactionElement;
		return (
			<View style={styles.rowOnly}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					{contractDeployment ? (
						<FadeIn>
							<Image source={ethLogo} style={styles.ethLogo} />
						</FadeIn>
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
			tx: {
				transaction: { gas, gasPrice, to, data, from },
				transactionHash
			},
			conversionRate,
			currentCurrency,
			tokens,
			contractExchangeRates
		} = this.props;
		const { actionKey } = this.state;
		const [addressTo, amount] = decodeTransferData('ERC20', data);
		const userHasToken = toChecksumAddress(to) in tokens;
		const token = userHasToken ? tokens[toChecksumAddress(to)] : null;
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
			renderFrom: renderFullAddress(from),
			renderTo: renderFullAddress(addressTo),
			transactionHash,
			renderValue: renderToken,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
			renderTotalValue:
				renderToken + ' ' + strings('unit.divisor') + ' ' + renderFromWei(totalGas) + ' ' + strings('unit.eth'),
			renderTotalValueFiat: totalFiatNumber ? totalFiatNumber + ' ' + currentCurrency.toUpperCase() : undefined
		};

		const transactionElement = {
			addressTo,
			actionKey: renderActionKey,
			value: !renderTokenAmount ? strings('transaction.value_not_available') : renderTokenAmount,
			fiatValue: renderTokenFiatAmount
		};

		return [transactionElement, transactionDetails];
	};

	renderTransferFromElement = () => {
		const {
			tx: {
				transaction: { gas, gasPrice, data, to },
				transactionHash
			},
			collectibleContracts
		} = this.props;
		let { actionKey } = this.state;
		const [addressFrom, addressTo, tokenId] = decodeTransferData('ERC721', data);
		const collectible = collectibleContracts.find(
			collectible => collectible.address.toLowerCase() === to.toLowerCase()
		);
		if (collectible) {
			actionKey = strings('transactions.sent') + ' ' + collectible.name;
		}

		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const renderCollectible = collectible
			? strings('unit.token_id') + tokenId + ' ' + collectible.symbol
			: strings('unit.token_id') + tokenId;

		const transactionDetails = {
			renderFrom: renderFullAddress(addressFrom),
			renderTo: renderFullAddress(addressTo),
			transactionHash,
			renderValue: renderCollectible,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
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
			addressTo,
			actionKey,
			value: `${strings('unit.token_id')}${tokenId}`,
			fiatValue: collectible ? collectible.symbol : undefined
		};

		return [transactionElement, transactionDetails];
	};

	renderConfirmElement = () => {
		const {
			tx: {
				transaction: { value, gas, gasPrice, from, to },
				transactionHash
			},
			conversionRate,
			currentCurrency
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
			renderFrom: renderFullAddress(from),
			renderTo: renderFullAddress(to),
			transactionHash,
			renderValue: renderFromWei(value) + ' ' + strings('unit.eth'),
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
			renderTotalValue: renderFromWei(totalValue) + ' ' + strings('unit.eth'),
			renderTotalValueFiat: weiToFiat(totalValue, conversionRate, currentCurrency).toUpperCase()
		};

		const transactionElement = {
			addressTo: to,
			actionKey,
			value: renderTotalEth,
			fiatValue: renderTotalEthFiat
		};

		return [transactionElement, transactionDetails];
	};

	renderDeploymentElement = () => {
		const {
			tx: {
				transaction: { value, gas, gasPrice, to, from },
				transactionHash
			},
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

		const transactionElement = {
			addressTo: to,
			actionKey,
			value: renderTotalEth,
			fiatValue: renderTotalEthFiat,
			contractDeployment: true
		};
		const transactionDetails = {
			renderFrom: renderFullAddress(from),
			renderTo: strings('transactions.to_contract'),
			transactionHash,
			renderValue: renderFromWei(value) + ' ' + strings('unit.eth'),
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
			renderTotalValue: renderFromWei(totalEth) + ' ' + strings('unit.eth'),
			renderTotalValueFiat: weiToFiat(totalEth, conversionRate, currentCurrency).toUpperCase()
		};

		return [transactionElement, transactionDetails];
	};

	render = () => {
		const {
			tx: {
				transaction: { gas, gasPrice }
			},
			selected,
			tx
		} = this.props;
		const { actionKey } = this.state;
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		let transactionElement, transactionDetails;
		switch (actionKey) {
			case strings('transactions.sent_tokens'):
				[transactionElement, transactionDetails] = this.renderTransferElement(totalGas);
				break;
			case strings('transactions.sent_collectible'):
				[transactionElement, transactionDetails] = this.renderTransferFromElement(totalGas);
				break;
			case strings('transactions.contract_deploy'):
				[transactionElement, transactionDetails] = this.renderDeploymentElement(totalGas);
				break;
			default:
				[transactionElement, transactionDetails] = this.renderConfirmElement(totalGas);
		}
		return (
			<TouchableOpacity
				style={styles.row}
				onPress={this.onPressItem} // eslint-disable-line react/jsx-no-bind
			>
				<View style={styles.rowContent}>
					{this.renderTxElement(transactionElement)}
					{this.renderTxDetails(selected, tx, transactionDetails)}
				</View>
			</TouchableOpacity>
		);
	};
}
