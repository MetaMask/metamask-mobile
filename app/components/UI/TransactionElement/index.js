import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableHighlight, StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { toLocaleDateTime } from '../../../util/date';
import Identicon from '../Identicon';
import { getActionKey } from '../../../util/transactions';
import TransactionDetails from './TransactionDetails';
import { safeToChecksumAddress } from '../../../util/address';
import FadeIn from 'react-native-fade-in-image';
import TokenImage from '../TokenImage';
import contractMap from 'eth-contract-metadata';
import { connect } from 'react-redux';
import AppConstants from '../../../core/AppConstants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import StyledButton from '../StyledButton';
import Networks from '../../../util/networks';
import Device from '../../../util/Device';
import Modal from 'react-native-modal';
import {
	decodePaymentChannelTx,
	decodeTransferTx,
	decodeTransferFromTx,
	decodeDeploymentTx,
	decodeConfirmTx
} from './utils';

const {
	CONNEXT: { CONTRACTS }
} = AppConstants;

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
		minHeight: Device.isIos() ? 95 : 100
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
	},
	modalContainer: {
		width: '90%',
		backgroundColor: colors.white,
		borderRadius: 10
	},
	modal: {
		margin: 0,
		width: '100%'
	},
	modalView: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	titleWrapper: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
		flexDirection: 'row'
	},
	title: {
		flex: 1,
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 24,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	closeIcon: { paddingTop: 4, position: 'absolute', right: 16 }
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
		// eslint-disable-next-line react/no-unused-prop-types
		contractExchangeRates: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		currentCurrency: PropTypes.string,
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
		// eslint-disable-next-line react/no-unused-prop-types
		tokens: PropTypes.object,
		/**
		 * An array that represents the user collectible contracts
		 */
		// eslint-disable-next-line react/no-unused-prop-types
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
		// eslint-disable-next-line react/no-unused-prop-types
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
		speedUpIsOpen: false,
		detailsModalVisible: false,
		transactionGas: { gasBN: undefined, gasPriceBN: undefined, gasTotal: undefined },
		transactionElement: undefined,
		transactionDetails: undefined
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
		let transactionElement, transactionDetails;
		if (paymentChannelTransaction) {
			[transactionElement, transactionDetails] = decodePaymentChannelTx({ ...this.props, actionKey });
		} else {
			switch (actionKey) {
				case strings('transactions.sent_tokens'):
					[transactionElement, transactionDetails] = await decodeTransferTx({ ...this.props, actionKey });
					break;
				case strings('transactions.sent_collectible'):
					[transactionElement, transactionDetails] = decodeTransferFromTx({ ...this.props, actionKey });
					break;
				case strings('transactions.contract_deploy'):
					[transactionElement, transactionDetails] = decodeDeploymentTx({ ...this.props, actionKey });
					break;
				default:
					[transactionElement, transactionDetails] = decodeConfirmTx({ ...this.props, actionKey });
			}
		}
		this.mounted && this.setState({ transactionElement, transactionDetails });
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
		this.setState({ detailsModalVisible: true });
	};

	onCloseDetailsModal = () => {
		this.setState({ detailsModalVisible: false });
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

	renderTxElementImage = transactionElement => {
		const {
			renderTo,
			renderFrom,
			actionKey,
			contractDeployment = false,
			paymentChannelTransaction
		} = transactionElement;
		const {
			tx: { networkID }
		} = this.props;
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
			const contract = CONTRACTS[networkID];
			const isDeposit = contract && renderTo.toLowerCase() === contract.toLowerCase();
			if (isDeposit) {
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
			const isWithdraw = renderFrom === CONTRACTS[networkID];
			if (isWithdraw) {
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
				transaction: { to }
			},
			providerType
		} = this.props;
		const { value, fiatValue = false, actionKey } = transactionElement;
		const networkId = Networks[providerType].networkId;
		const renderTxActions = status === 'submitted' || status === 'approved';
		const renderSpeedUpAction = safeToChecksumAddress(to) !== AppConstants.CONNEXT.CONTRACTS[networkId];
		return (
			<View style={styles.rowOnly}>
				{this.renderTxTime()}
				<View style={styles.subRow}>
					{this.renderTxElementImage(transactionElement)}
					<View style={styles.info} numberOfLines={1}>
						<Text numberOfLines={1} style={styles.address}>
							{actionKey}
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
		const { tx, showAlert, blockExplorer } = this.props;
		const { detailsModalVisible, transactionElement, transactionDetails } = this.state;

		if (!transactionElement || !transactionDetails) return <View />;
		return (
			<View>
				<TouchableHighlight
					style={styles.row}
					onPress={this.onPressItem}
					underlayColor={colors.grey000}
					activeOpacity={1}
				>
					<View style={styles.rowContent}>{this.renderTxElement(transactionElement)}</View>
				</TouchableHighlight>
				<Modal
					isVisible={detailsModalVisible}
					style={styles.modal}
					onBackdropPress={this.onCloseDetailsModal}
					onBackButtonPress={this.onCloseDetailsModal}
					onSwipeComplete={this.onCloseDetailsModal}
					swipeDirection={'down'}
				>
					<View style={styles.modalView}>
						<View style={styles.modalContainer}>
							<View style={styles.titleWrapper}>
								<Text style={styles.title} onPress={this.onCloseDetailsModal}>
									{transactionElement.actionKey}
								</Text>
								<Ionicons
									onPress={this.onCloseDetailsModal}
									name={'ios-close'}
									size={38}
									style={styles.closeIcon}
								/>
							</View>
							<TransactionDetails
								transactionObject={tx}
								blockExplorer={blockExplorer}
								showAlert={showAlert}
								transactionDetails={transactionDetails}
								navigation={this.props.navigation}
							/>
						</View>
					</View>
				</Modal>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	providerType: state.engine.backgroundState.NetworkController.provider.type
});
export default connect(mapStateToProps)(TransactionElement);
