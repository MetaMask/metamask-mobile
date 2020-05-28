import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableHighlight, StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { toDateFormat } from '../../../util/date';
import TransactionDetails from './TransactionDetails';
import { safeToChecksumAddress } from '../../../util/address';
import { connect } from 'react-redux';
import AppConstants from '../../../core/AppConstants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import StyledButton from '../StyledButton';
import Networks from '../../../util/networks';
import Device from '../../../util/Device';
import Modal from 'react-native-modal';
import decodeTransaction from './utils';
import { TRANSACTION_TYPES } from '../../../util/transactions';

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
		marginTop: 4,
		fontSize: 12,
		letterSpacing: 0.5,
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
	ethLogo: {
		width: 28,
		height: 28
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
	closeIcon: { paddingTop: 4, position: 'absolute', right: 16 },
	iconWrapper: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	statusText: {
		fontSize: 12,
		...fontStyles.normal
	}
});

const transactionIconApprove = require('../../../images/transaction-icons/approve.png'); // eslint-disable-line
const transactionIconInteraction = require('../../../images/transaction-icons/interaction.png'); // eslint-disable-line
const transactionIconSent = require('../../../images/transaction-icons/send.png'); // eslint-disable-line
const transactionIconReceived = require('../../../images/transaction-icons/receive.png'); // eslint-disable-line

const transactionIconApproveFailed = require('../../../images/transaction-icons/approve-failed.png'); // eslint-disable-line
const transactionIconInteractionFailed = require('../../../images/transaction-icons/interaction-failed.png'); // eslint-disable-line
const transactionIconSentFailed = require('../../../images/transaction-icons/send-failed.png'); // eslint-disable-line
const transactionIconReceivedFailed = require('../../../images/transaction-icons/receive-failed.png'); // eslint-disable-line

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
		 * Current provider ticker
		 */
		// eslint-disable-next-line react/no-unused-prop-types
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
		providerType: PropTypes.string,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		primaryCurrency: PropTypes.string
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
		const [transactionElement, transactionDetails] = await decodeTransaction(this.props);
		this.mounted = true;
		this.mounted && this.setState({ transactionElement, transactionDetails });
	};

	componentWillUnmount() {
		this.mounted = false;
	}

	getStatusStyle(status) {
		switch (status) {
			case 'confirmed':
				return [styles.statusText, { color: colors.green400 }];
			case 'pending':
			case 'submitted':
				return [styles.statusText, { color: colors.orange }];
			case 'failed':
			case 'cancelled':
				return [styles.statusText, { color: colors.red }];
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
				{`${toDateFormat(tx.time)}`}
			</Text>
		);
	};

	renderTxElementIcon = (transactionElement, status) => {
		const { transactionType } = transactionElement;
		const isFailedTransaction = status === 'cancelled' || status === 'failed';
		let icon;
		switch (transactionType) {
			case TRANSACTION_TYPES.PAYMENT_CHANNEL_DEPOSIT:
			case TRANSACTION_TYPES.PAYMENT_CHANNEL_SENT:
			case TRANSACTION_TYPES.SENT:
				icon = isFailedTransaction ? transactionIconSentFailed : transactionIconSent;
				break;
			case TRANSACTION_TYPES.PAYMENT_CHANNEL_WITHDRAW:
			case TRANSACTION_TYPES.PAYMENT_CHANNEL_RECEIVED:
			case TRANSACTION_TYPES.RECEIVED:
				icon = isFailedTransaction ? transactionIconReceivedFailed : transactionIconReceived;
				break;
			case TRANSACTION_TYPES.SITE_INTERACTION:
				icon = isFailedTransaction ? transactionIconInteractionFailed : transactionIconInteraction;
				break;
			case TRANSACTION_TYPES.APPROVE:
				icon = isFailedTransaction ? transactionIconApproveFailed : transactionIconApprove;
				break;
		}
		return (
			<View style={styles.iconWrapper}>
				<Image source={icon} style={styles.ethLogo} />
			</View>
		);
	};

	renderStatusText = status => {
		status = status && status.charAt(0).toUpperCase() + status.slice(1);
		switch (status) {
			case 'Confirmed':
				return <Text style={[styles.status, { color: colors.green400 }]}>{status}</Text>;
			case 'Pending':
			case 'Submitted':
				return <Text style={[styles.status, { color: colors.orange }]}>{status}</Text>;
			case 'Failed':
			case 'Cancelled':
				return <Text style={[styles.status, { color: colors.red }]}>{status}</Text>;
		}
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
					{this.renderTxElementIcon(transactionElement, status)}
					<View style={styles.info} numberOfLines={1}>
						<Text numberOfLines={1} style={styles.address}>
							{actionKey}
						</Text>
						{this.renderStatusText(status)}
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
			type={'cancel'}
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
		const { tx } = this.props;
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
								transactionDetails={transactionDetails}
								navigation={this.props.navigation}
								close={this.onCloseDetailsModal}
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
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	primaryCurrency: state.settings.primaryCurrency
});
export default connect(mapStateToProps)(TransactionElement);
