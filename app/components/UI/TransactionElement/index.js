import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Platform, TouchableHighlight, StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { toLocaleDateTime } from '../../../util/date';
import { renderFromWei, weiToFiat, hexToBN, toBN, isBN, renderToGwei } from '../../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import Identicon from '../Identicon';
import { getActionKey, decodeTransferData, getTicker } from '../../../util/transactions';
import TransactionDetails from './TransactionDetails';
import { renderFullAddress } from '../../../util/address';
import FadeIn from 'react-native-fade-in-image';
import TokenImage from '../TokenImage';
import contractMap from 'eth-contract-metadata';
import TransferElement from './TransferElement';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	row: {
		backgroundColor: colors.white,
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	},
	rowContent: {
		padding: 0
	},
	rowOnly: {
		padding: 15,
		height: Platform.OS === 'ios' ? 95 : 100
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
		backgroundColor: colors.grey000,
		color: colors.grey400,
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
		backgroundColor: colors.green100,
		color: colors.green500
	},
	statusSubmitted: {
		backgroundColor: colors.orange000,
		color: colors.orange300
	},
	statusFailed: {
		backgroundColor: colors.red000,
		color: colors.red
	},
	ethLogo: {
		width: 24,
		height: 24
	},
	tokenImageStyle: {
		width: 24,
		height: 24,
		borderRadius: 12
	}
});

const ethLogo = require('../../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that renders a transaction item part of transactions list
 */
class TransactionElement extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
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
		showAlert: PropTypes.func,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		actionKey: undefined
	};

	mounted = false;

	componentDidMount = async () => {
		this.mounted = true;
		const { tx, selectedAddress, ticker } = this.props;
		const actionKey = await getActionKey(tx, selectedAddress, ticker);
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
				transactionDetails={transactionDetails}
				navigation={this.props.navigation}
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
		const checksumAddress = toChecksumAddress(addressTo);
		let symbol, logo;
		if (checksumAddress in contractMap) {
			symbol = contractMap[checksumAddress].symbol;
			logo = contractMap[checksumAddress].logo;
		}
		return (
			<View style={styles.rowOnly}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					{contractDeployment ? (
						<FadeIn>
							<Image source={ethLogo} style={styles.ethLogo} />
						</FadeIn>
					) : actionKey === strings('transactions.smart_contract_interaction') ? (
						<TokenImage
							asset={{ address: addressTo, logo }}
							containerStyle={styles.tokenImageStyle}
							iconStyle={styles.tokenImageStyle}
							logoDefined
						/>
					) : (
						<Identicon address={addressTo} diameter={24} />
					)}
					<View style={styles.info}>
						<Text numberOfLines={1} style={styles.address}>
							{symbol ? symbol + ' ' + actionKey : actionKey}
						</Text>
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

	renderTransferFromElement = () => {
		const {
			tx: {
				transaction: { gas, gasPrice, data, to },
				transactionHash
			},
			collectibleContracts
		} = this.props;
		let { actionKey } = this.state;
		const [addressFrom, addressTo, tokenId] = decodeTransferData('transferFrom', data);
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
		const ticker = getTicker(this.props.ticker);
		const { actionKey } = this.state;
		const totalEth = hexToBN(value);
		const renderTotalEth = renderFromWei(totalEth) + ' ' + ticker;
		const renderTotalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency.toUpperCase());

		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const totalValue = isBN(totalEth) ? totalEth.add(totalGas) : totalGas;

		const transactionDetails = {
			renderFrom: renderFullAddress(from),
			renderTo: renderFullAddress(to),
			transactionHash,
			renderValue: renderFromWei(value) + ' ' + ticker,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
			renderTotalValue: renderFromWei(totalValue) + ' ' + ticker,
			renderTotalValueFiat: weiToFiat(totalValue, conversionRate, currentCurrency.toUpperCase())
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
		const ticker = getTicker(this.props.ticker);
		const { actionKey } = this.state;
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');

		const renderTotalEth = renderFromWei(totalGas) + ' ' + ticker;
		const renderTotalEthFiat = weiToFiat(totalGas, conversionRate, currentCurrency.toUpperCase());
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
			renderValue: renderFromWei(value) + ' ' + ticker,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
			renderTotalValue: renderFromWei(totalEth) + ' ' + ticker,
			renderTotalValueFiat: weiToFiat(totalEth, conversionRate, currentCurrency.toUpperCase())
		};

		return [transactionElement, transactionDetails];
	};

	render() {
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
		if (actionKey === strings('transactions.sent_tokens')) {
			return (
				<TransferElement
					renderTxElement={this.renderTxElement}
					renderTxDetails={this.renderTxDetails}
					tx={this.props.tx}
					contractExchangeRates={this.props.contractExchangeRates}
					conversionRate={this.props.conversionRate}
					currentCurrency={this.props.currentCurrency}
					selected={this.props.selected}
					selectedAddress={this.props.selectedAddress}
					i={this.props.i}
					onPressItem={this.props.onPressItem}
					tokens={this.props.tokens}
					collectibleContracts={this.props.collectibleContracts}
				/>
			);
		}
		switch (actionKey) {
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
			<TouchableHighlight
				style={styles.row}
				onPress={this.onPressItem} // eslint-disable-line react/jsx-no-bind
				underlayColor={colors.grey000}
				activeOpacity={1}
			>
				<View style={styles.rowContent}>
					{this.renderTxElement(transactionElement)}
					{this.renderTxDetails(selected, tx, transactionDetails)}
				</View>
			</TouchableHighlight>
		);
	}
}

const mapStateToProps = state => ({
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});
export default connect(mapStateToProps)(TransactionElement);
