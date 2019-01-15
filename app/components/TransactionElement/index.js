import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, TouchableOpacity, StyleSheet, Text, View, Image } from 'react-native';
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
	balanceToFiatNumber
} from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import Identicon from '../Identicon';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getActionKey, decodeTransferData } from '../../util/transactions';
import { getNetworkTypeById } from '../../util/networks';
import { getEtherscanTransactionUrl } from '../../util/etherscan';
import TransactionDetails from './TransactionDetails';
import Logger from '../../util/Logger';

const styles = StyleSheet.create({
	row: {
		backgroundColor: colors.white,
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	rowContent: {
		padding: 15
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
	},
	detailRowTitle: {
		flex: 1,
		paddingVertical: 10,
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	detailRowInfo: {
		borderRadius: 5,
		shadowColor: colors.accentGray,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		backgroundColor: colors.white,
		padding: 10,
		marginBottom: 5
	},
	detailRowText: {
		flex: 1,
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	hash: {
		fontSize: 12
	},
	singleRow: {
		flex: 1,
		flexDirection: 'row'
	},
	copyIcon: {
		paddingRight: 5
	}
});

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that renders a transaction item part of transactions list
 */
class TransactionElement extends PureComponent {
	static propTypes = {
		/**
		 * The navigation Object
		 */
		navigation: PropTypes.object,
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
		toggleDetailsView: PropTypes.func,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.object,
		/**
		 * Boolean to determine if this network supports a block explorer
		 */
		blockExplorer: PropTypes.bool
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

	toggleDetailsView = () => {
		const { tx, i, toggleDetailsView } = this.props;
		toggleDetailsView(tx.transactionHash, i);
	};

	renderTxHash = transactionHash => {
		if (!transactionHash) return null;
		return (
			<View>
				<Text style={styles.detailRowTitle}>{strings('transactions.hash')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={[styles.detailRowText, styles.hash]}>{`${transactionHash.substr(
						0,
						20
					)} ... ${transactionHash.substr(-20)}`}</Text>
					{this.renderCopyIcon(transactionHash)}
				</View>
			</View>
		);
	};

	renderCopyIcon = str => {
		function copy() {
			Clipboard.setString(str);
		}
		return (
			<TouchableOpacity style={styles.copyIcon} onPress={copy}>
				<Icon name={'copy'} size={15} color={colors.primary} />
			</TouchableOpacity>
		);
	};

	viewOnEtherscan = () => {
		const { transactionHash, networkID } = this.props.tx;
		try {
			const network = getNetworkTypeById(networkID);
			const url = getEtherscanTransactionUrl(network, transactionHash);
			this.props.navigation.push('BrowserView', {
				url
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			Logger.error(`can't get a block explorer link for network `, networkID, e);
		}
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

	renderTransferElement = () => {
		const {
			tx,
			conversionRate,
			currentCurrency,
			tokens,
			contractExchangeRates,
			selected,
			blockExplorer
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
		const transfer = {
			to: addressTo,
			amount: renderTokenAmount,
			amountFiat: renderTokenFiatNumber
		};
		return (
			<View style={styles.rowContent}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					<Identicon address={addressTo} diameter={24} />
					<View style={styles.info}>
						<Text style={styles.address}>{renderActionKey}</Text>
						<Text style={[styles.status, this.getStatusStyle(tx.status)]}>{tx.status.toUpperCase()}</Text>
					</View>
					<View style={styles.amounts}>
						<Text style={styles.amount}>
							{!renderTokenAmount ? strings('transaction.value_not_available') : renderTokenAmount}
						</Text>
						<Text style={styles.amountFiat}>{renderTokenFiatAmount}</Text>
					</View>
				</View>
				{selected ? (
					<TransactionDetails transactionObject={{ ...tx, ...{ transfer } }} blockExplorer={blockExplorer} />
				) : null}
			</View>
		);
	};

	renderConfirmElement = () => {
		const {
			tx,
			tx: {
				transaction: { value }
			},
			conversionRate,
			currentCurrency,
			selected,
			blockExplorer
		} = this.props;
		const { actionKey } = this.state;
		const totalETh = hexToBN(value);
		const renderTotalEth = renderFromWei(totalETh) + ' ' + strings('unit.eth');
		const renderTotalEthFiat = weiToFiat(totalETh, conversionRate, currentCurrency).toUpperCase();
		return (
			<View style={styles.rowContent}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					<Identicon address={tx.transaction.to} diameter={24} />
					<View style={styles.info}>
						<Text style={styles.address}>{actionKey}</Text>
						<Text style={[styles.status, this.getStatusStyle(tx.status)]}>{tx.status.toUpperCase()}</Text>
					</View>
					<View style={styles.amounts}>
						<Text style={styles.amount}>{renderTotalEth}</Text>
						<Text style={styles.amountFiat}>{renderTotalEthFiat}</Text>
					</View>
				</View>
				{selected ? <TransactionDetails transactionObject={tx} blockExplorer={blockExplorer} /> : null}
			</View>
		);
	};

	renderDeploymentElement = totalGas => {
		const { tx, selected, blockExplorer, conversionRate, currentCurrency } = this.props;
		const { actionKey } = this.state;
		const renderTotalEth = renderFromWei(totalGas) + ' ' + strings('unit.eth');
		const renderTotalEthFiat = weiToFiat(totalGas, conversionRate, currentCurrency).toUpperCase();
		return (
			<View style={styles.rowContent}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					<Image source={ethLogo} style={styles.ethLogo} />
					<View style={styles.info}>
						<Text style={styles.address}>{actionKey}</Text>
						<Text style={[styles.status, this.getStatusStyle(tx.status)]}>{tx.status.toUpperCase()}</Text>
					</View>
					<View style={styles.amounts}>
						<Text style={styles.amount}>{renderTotalEth}</Text>
						<Text style={styles.amountFiat}>{renderTotalEthFiat}</Text>
					</View>
				</View>
				{selected ? <TransactionDetails transactionObject={tx} blockExplorer={blockExplorer} /> : null}
			</View>
		);
	};

	render = () => {
		const {
			tx,
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
			case strings('transactions.contract_deploy'):
				transactionElement = this.renderDeploymentElement(totalGas);
				break;
			default:
				transactionElement = this.renderConfirmElement(totalGas);
		}

		return (
			<TouchableOpacity
				style={styles.row}
				key={`tx-${tx.id}`}
				onPress={this.toggleDetailsView} // eslint-disable-line react/jsx-no-bind
			>
				{transactionElement}
			</TouchableOpacity>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(TransactionElement);
