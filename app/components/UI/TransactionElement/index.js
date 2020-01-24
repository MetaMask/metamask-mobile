import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Platform, TouchableHighlight, StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { toLocaleDateTime } from '../../../util/date';
import { renderFromWei, weiToFiat, hexToBN, toBN, isBN, renderToGwei, balanceToFiat } from '../../../util/number';
import { isValidAddress } from 'ethereumjs-util';
import Identicon from '../Identicon';
import { getActionKey, decodeTransferData, getTicker } from '../../../util/transactions';
import TransactionDetails from './TransactionDetails';
import { renderFullAddress, safeToChecksumAddress } from '../../../util/address';
import FadeIn from 'react-native-fade-in-image';
import TokenImage from '../TokenImage';
import contractMap from 'eth-contract-metadata';
import TransferElement from './TransferElement';
import { connect } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import StyledButton from '../StyledButton';
import Networks from '../../../util/networks';
import AppConstants from '../../../core/AppConstants';

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
		minHeight: Platform.OS === 'ios' ? 95 : 100
	},
	date: {
		color: colors.fontSecondary,
		fontSize: 12,
		marginBottom: 10,
		...fontStyles.normal
	},
	info: {
		flex: 1,
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
		textTransform: 'uppercase',
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
		textTransform: 'uppercase',
		...fontStyles.normal
	},
	amounts: {
		flex: 0.6,
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
	},
	paymentChannelTransactionIconWrapper: {
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.grey100,
		borderRadius: 12,
		width: 24,
		height: 24,
		backgroundColor: colors.white
	},
	paymentChannelTransactionDepositIcon: {
		marginTop: 2,
		marginLeft: 1
	},
	paymentChannelTransactionWithdrawIcon: {
		marginBottom: 2,
		marginRight: 1,
		transform: [{ rotate: '180deg' }]
	},
	actionContainerStyle: {
		height: 25,
		width: 70,
		padding: 0
	},
	speedupActionContainerStyle: {
		marginRight: 10
	},
	actionStyle: {
		fontSize: 10,
		padding: 0,
		paddingHorizontal: 10
	},
	transactionActionsContainer: {
		flexDirection: 'row',
		paddingTop: 10,
		paddingLeft: 40
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
		ticker: PropTypes.string,
		/**
		 * Current exchange rate
		 */
		exchangeRate: PropTypes.number,
		/**
		 * Callback to speed up tx
		 */
		onSpeedUpAction: PropTypes.func,
		/**
		 * Callback to cancel tx
		 */
		onCancelAction: PropTypes.func,
		/**
		 * A string representing the network name
		 */
		providerType: PropTypes.string
	};

	state = {
		actionKey: undefined,
		cancelIsOpen: false,
		speedUpIsOpen: false
	};

	mounted = false;

	componentDidMount = async () => {
		this.mounted = true;
		const {
			tx,
			tx: { paymentChannelTransaction },
			selectedAddress,
			ticker
		} = this.props;
		const actionKey = tx.actionKey || (await getActionKey(tx, selectedAddress, ticker, paymentChannelTransaction));
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
		const incoming = safeToChecksumAddress(tx.transaction.to) === selectedAddress;
		const selfSent = incoming && safeToChecksumAddress(tx.transaction.from) === selectedAddress;
		return (
			<Text style={styles.date}>
				{(!incoming || selfSent) && tx.transaction.nonce && `#${parseInt(tx.transaction.nonce, 16)}  - `}
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

	renderTxElementImage = transactionElement => {
		const {
			renderTo,
			actionKey,
			contractDeployment = false,
			paymentChannelTransaction,
			isInstaPayDeposit,
			isInstaPayWithdrawal
		} = transactionElement;

		let logo;

		if (contractDeployment) {
			return (
				<FadeIn>
					<Image source={ethLogo} style={styles.ethLogo} />
				</FadeIn>
			);
		} else if (actionKey === strings('transactions.smart_contract_interaction')) {
			if (renderTo in contractMap) {
				logo = contractMap[renderTo].logo;
			}
			return (
				<TokenImage
					asset={{ address: renderTo, logo }}
					containerStyle={styles.tokenImageStyle}
					iconStyle={styles.tokenImageStyle}
					logoDefined
				/>
			);
		} else if (paymentChannelTransaction) {
			if (isInstaPayDeposit) {
				return (
					<FadeIn style={styles.paymentChannelTransactionIconWrapper}>
						<Ionicons
							style={styles.paymentChannelTransactionDepositIcon}
							name={'md-arrow-down'}
							size={16}
							color={colors.green500}
						/>
					</FadeIn>
				);
			}
			if (isInstaPayWithdrawal) {
				return (
					<FadeIn style={styles.paymentChannelTransactionIconWrapper}>
						<Ionicons
							style={styles.paymentChannelTransactionWithdrawIcon}
							name={'md-arrow-down'}
							size={16}
							color={colors.grey500}
						/>
					</FadeIn>
				);
			}
		}
		return <Identicon address={renderTo} diameter={24} />;
	};

	/**
	 * Renders an horizontal bar with basic tx information
	 *
	 * @param {object} transactionElement - Transaction information to render, containing addressTo, actionKey, value, fiatValue, contractDeployment
	 */
	renderTxElement = transactionElement => {
		const {
			tx: {
				status,
				transaction: { to },
				paymentChannelTransaction
			},
			providerType
		} = this.props;
		const { renderTo, actionKey, value, fiatValue = false } = transactionElement;
		let symbol;
		if (renderTo in contractMap) {
			symbol = contractMap[renderTo].symbol;
		}
		const networkId = Networks[providerType].networkId;
		const renderTxActions = (status === 'submitted' || status === 'approved') && !paymentChannelTransaction;
		const renderSpeedUpAction = safeToChecksumAddress(to) !== AppConstants.CONNEXT.CONTRACTS[networkId];
		return (
			<View style={styles.rowOnly}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					{this.renderTxElementImage(transactionElement)}
					<View style={styles.info} numberOfLines={1}>
						<Text numberOfLines={1} style={styles.address}>
							{symbol ? symbol + ' ' + actionKey : actionKey}
						</Text>
						<Text style={[styles.status, this.getStatusStyle(status)]}>{status}</Text>
					</View>
					<View style={styles.amounts}>
						<Text style={styles.amount}>{value}</Text>
						<Text style={styles.amountFiat}>{fiatValue}</Text>
					</View>
				</View>
				{!!renderTxActions && (
					<View style={styles.transactionActionsContainer}>
						{renderSpeedUpAction && this.renderSpeedUpButton()}
						{this.renderCancelButton()}
					</View>
				)}
			</View>
		);
	};

	decodeTransferFromTx = () => {
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

		const renderFrom = renderFullAddress(addressFrom);
		const renderTo = renderFullAddress(addressTo);

		const transactionDetails = {
			renderFrom,
			renderTo,
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
			renderTo,
			renderFrom,
			actionKey,
			value: `${strings('unit.token_id')}${tokenId}`,
			fiatValue: collectible ? collectible.symbol : undefined
		};

		return [transactionElement, transactionDetails];
	};

	decodeConfirmTx = () => {
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
		const renderTotalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency);

		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const totalValue = isBN(totalEth) ? totalEth.add(totalGas) : totalGas;

		const renderFrom = renderFullAddress(from);
		const renderTo = renderFullAddress(to);

		const transactionDetails = {
			renderFrom,
			renderTo,
			transactionHash,
			renderValue: renderFromWei(value) + ' ' + ticker,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
			renderTotalValue: renderFromWei(totalValue) + ' ' + ticker,
			renderTotalValueFiat: weiToFiat(totalValue, conversionRate, currentCurrency)
		};

		const transactionElement = {
			renderTo,
			renderFrom,
			actionKey,
			value: renderTotalEth,
			fiatValue: renderTotalEthFiat
		};

		return [transactionElement, transactionDetails];
	};

	decodeDeploymentTx = () => {
		const {
			tx: {
				transaction: { value, gas, gasPrice, from },
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
		const renderTotalEthFiat = weiToFiat(totalGas, conversionRate, currentCurrency);
		const totalEth = isBN(value) ? value.add(totalGas) : totalGas;

		const renderFrom = renderFullAddress(from);
		const renderTo = strings('transactions.to_contract');

		const transactionElement = {
			renderTo,
			renderFrom,
			actionKey,
			value: renderTotalEth,
			fiatValue: renderTotalEthFiat,
			contractDeployment: true
		};
		const transactionDetails = {
			renderFrom,
			renderTo,
			transactionHash,
			renderValue: renderFromWei(value) + ' ' + ticker,
			renderGas: parseInt(gas, 16).toString(),
			renderGasPrice: renderToGwei(gasPrice),
			renderTotalValue: renderFromWei(totalEth) + ' ' + ticker,
			renderTotalValueFiat: weiToFiat(totalEth, conversionRate, currentCurrency)
		};

		return [transactionElement, transactionDetails];
	};

	decodePaymentChannelTx = () => {
		const {
			tx: {
				transactionHash,
				transaction: { value, gas, gasPrice, from, to },
				isInstaPayDeposit,
				isInstaPayWithdrawal
			},
			conversionRate,
			currentCurrency,
			exchangeRate
		} = this.props;
		const { actionKey } = this.state;
		const totalEth = hexToBN(value);
		const totalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency);
		const readableTotalEth = renderFromWei(totalEth);
		const renderTotalEth = readableTotalEth + ' ' + (isInstaPayDeposit ? strings('unit.eth') : strings('unit.dai'));
		const renderTotalEthFiat = isInstaPayDeposit
			? totalEthFiat
			: balanceToFiat(parseFloat(readableTotalEth), conversionRate, exchangeRate, currentCurrency);

		const renderFrom = isValidAddress(from) ? renderFullAddress(from) : from;
		const renderTo = isValidAddress(to) ? renderFullAddress(to) : to;

		const transactionDetails = {
			renderFrom,
			renderTo,
			transactionHash,
			renderGas: gas ? parseInt(gas, 16).toString() : strings('transactions.tx_details_not_available'),
			renderGasPrice: gasPrice ? renderToGwei(gasPrice) : strings('transactions.tx_details_not_available'),
			renderValue: renderTotalEth,
			renderTotalValue: renderTotalEth,
			renderTotalValueFiat: isInstaPayDeposit && totalEthFiat
		};

		const transactionElement = {
			renderFrom,
			renderTo,
			actionKey,
			value: renderTotalEth,
			fiatValue: renderTotalEthFiat,
			paymentChannelTransaction: true,
			isInstaPayWithdrawal,
			isInstaPayDeposit
		};

		return [transactionElement, transactionDetails];
	};

	renderCancelButton = () => (
		<StyledButton
			type={'danger'}
			containerStyle={styles.actionContainerStyle}
			style={styles.actionStyle}
			onPress={this.showCancelModal}
		>
			{strings('transaction.cancel')}
		</StyledButton>
	);

	showCancelModal = () => {
		const { tx } = this.props;
		const existingGasPrice = tx.transaction ? tx.transaction.gasPrice : '0x0';
		const existingGasPriceDecimal = parseInt(existingGasPrice === undefined ? '0x0' : existingGasPrice, 16);
		this.mounted && this.props.onCancelAction(true, existingGasPriceDecimal, this.props.tx);
	};

	showSpeedUpModal = () => {
		const { tx } = this.props;
		const existingGasPrice = tx.transaction ? tx.transaction.gasPrice : '0x0';
		const existingGasPriceDecimal = parseInt(existingGasPrice === undefined ? '0x0' : existingGasPrice, 16);
		this.mounted && this.props.onSpeedUpAction(true, existingGasPriceDecimal, this.props.tx);
	};

	hideSpeedUpModal = () => {
		this.mounted && this.props.onSpeedUpAction(false);
	};

	renderSpeedUpButton = () => (
		<StyledButton
			type={'normal'}
			containerStyle={[styles.actionContainerStyle, styles.speedupActionContainerStyle]}
			style={styles.actionStyle}
			onPress={this.showSpeedUpModal}
		>
			{strings('transaction.speedup')}
		</StyledButton>
	);

	render() {
		const {
			tx: {
				paymentChannelTransaction,
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
		if (paymentChannelTransaction) {
			[transactionElement, transactionDetails] = this.decodePaymentChannelTx();
		} else {
			switch (actionKey) {
				case strings('transactions.sent_collectible'):
					[transactionElement, transactionDetails] = this.decodeTransferFromTx(totalGas);
					break;
				case strings('transactions.contract_deploy'):
					[transactionElement, transactionDetails] = this.decodeDeploymentTx(totalGas);
					break;
				default:
					[transactionElement, transactionDetails] = this.decodeConfirmTx(totalGas);
			}
		}
		return (
			<TouchableHighlight
				style={styles.row}
				onPress={this.onPressItem}
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
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	providerType: state.engine.backgroundState.NetworkController.provider.type
});
export default connect(mapStateToProps)(TransactionElement);
