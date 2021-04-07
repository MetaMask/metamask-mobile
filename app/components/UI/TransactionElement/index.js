import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableHighlight, StyleSheet, Image } from 'react-native';
import { colors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { toDateFormat } from '../../../util/date';
import TransactionDetails from './TransactionDetails';
import { safeToChecksumAddress } from '../../../util/address';
import { connect } from 'react-redux';
import StyledButton from '../StyledButton';
import Modal from 'react-native-modal';
import decodeTransaction from './utils';
import { TRANSACTION_TYPES } from '../../../util/transactions';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import DetailsModal from '../../Base/DetailsModal';

const styles = StyleSheet.create({
	row: {
		backgroundColor: colors.white,
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
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
	icon: {
		width: 28,
		height: 28
	}
});

/* eslint-disable import/no-commonjs */
const transactionIconApprove = require('../../../images/transaction-icons/approve.png');
const transactionIconInteraction = require('../../../images/transaction-icons/interaction.png');
const transactionIconSent = require('../../../images/transaction-icons/send.png');
const transactionIconReceived = require('../../../images/transaction-icons/receive.png');

const transactionIconApproveFailed = require('../../../images/transaction-icons/approve-failed.png');
const transactionIconInteractionFailed = require('../../../images/transaction-icons/interaction-failed.png');
const transactionIconSentFailed = require('../../../images/transaction-icons/send-failed.png');
const transactionIconReceivedFailed = require('../../../images/transaction-icons/receive-failed.png');
/* eslint-enable import/no-commonjs */

/**
 * View that renders a transaction item part of transactions list
 */
class TransactionElement extends PureComponent {
	static propTypes = {
		assetSymbol: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Asset object (in this case ERC721 token)
		 */
		tx: PropTypes.object,
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
		 * Callback to speed up tx
		 */
		onSpeedUpAction: PropTypes.func,
		/**
		 * Callback to cancel tx
		 */
		onCancelAction: PropTypes.func,
		swapsTransactions: PropTypes.object,
		swapsTokens: PropTypes.arrayOf(PropTypes.object)
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
		const [transactionElement, transactionDetails] = await decodeTransaction({
			...this.props,
			swapsTransactions: this.props.swapsTransactions,
			swapsTokens: this.props.swapsTokens,
			assetSymbol: this.props.assetSymbol
		});
		this.mounted = true;
		this.mounted && this.setState({ transactionElement, transactionDetails });
	};

	componentWillUnmount() {
		this.mounted = false;
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
		return `${
			(!incoming || selfSent) && tx.transaction.nonce ? `#${parseInt(tx.transaction.nonce, 16)}  - ` : ''
		}${toDateFormat(tx.time)}`;
	};

	renderTxElementIcon = (transactionElement, status) => {
		const { transactionType } = transactionElement;
		const isFailedTransaction = status === 'cancelled' || status === 'failed';
		let icon;
		switch (transactionType) {
			case TRANSACTION_TYPES.SENT_TOKEN:
			case TRANSACTION_TYPES.SENT_COLLECTIBLE:
			case TRANSACTION_TYPES.SENT:
				icon = isFailedTransaction ? transactionIconSentFailed : transactionIconSent;
				break;
			case TRANSACTION_TYPES.RECEIVED_TOKEN:
			case TRANSACTION_TYPES.RECEIVED_COLLECTIBLE:
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
		return <Image source={icon} style={styles.icon} resizeMode="stretch" />;
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
		const { value, fiatValue = false, actionKey } = transactionElement;
		const renderTxActions = status === 'submitted' || status === 'approved';
		return (
			<ListItem>
				<ListItem.Date>{this.renderTxTime()}</ListItem.Date>
				<ListItem.Content>
					<ListItem.Icon>{this.renderTxElementIcon(transactionElement, status)}</ListItem.Icon>
					<ListItem.Body>
						<ListItem.Title numberOfLines={1}>{actionKey}</ListItem.Title>
						<StatusText status={status} />
					</ListItem.Body>
					{Boolean(value) && (
						<ListItem.Amounts>
							<ListItem.Amount>{value}</ListItem.Amount>
							<ListItem.FiatAmount>{fiatValue}</ListItem.FiatAmount>
						</ListItem.Amounts>
					)}
				</ListItem.Content>
				{!!renderTxActions && (
					<ListItem.Actions>
						{this.renderSpeedUpButton()}
						{this.renderCancelButton()}
					</ListItem.Actions>
				)}
			</ListItem>
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
		this.mounted && this.props.onSpeedUpAction(true, existingGasPriceDecimal, tx);
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

		if (!transactionElement || !transactionDetails) return null;
		return (
			<>
				<TouchableHighlight
					style={styles.row}
					onPress={this.onPressItem}
					underlayColor={colors.grey000}
					activeOpacity={1}
				>
					{this.renderTxElement(transactionElement)}
				</TouchableHighlight>
				<Modal
					isVisible={detailsModalVisible}
					onBackdropPress={this.onCloseDetailsModal}
					onBackButtonPress={this.onCloseDetailsModal}
					onSwipeComplete={this.onCloseDetailsModal}
					swipeDirection={'down'}
				>
					<DetailsModal>
						<DetailsModal.Header>
							<DetailsModal.Title onPress={this.onCloseDetailsModal}>
								{transactionElement?.actionKey}
							</DetailsModal.Title>
							<DetailsModal.CloseIcon onPress={this.onCloseDetailsModal} />
						</DetailsModal.Header>
						<TransactionDetails
							transactionObject={tx}
							transactionDetails={transactionDetails}
							navigation={this.props.navigation}
							close={this.onCloseDetailsModal}
						/>
					</DetailsModal>
				</Modal>
			</>
		);
	}
}

const mapStateToProps = state => ({
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	primaryCurrency: state.settings.primaryCurrency,
	swapsTransactions: state.engine.backgroundState.TransactionController.swapsTransactions || {},
	swapsTokens: state.engine.backgroundState.SwapsController.tokens
});
export default connect(mapStateToProps)(TransactionElement);
