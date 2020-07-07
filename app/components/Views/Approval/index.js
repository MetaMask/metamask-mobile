import React, { PureComponent } from 'react';
import { StyleSheet, Alert, InteractionManager } from 'react-native';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../../UI/TransactionEditor';
import Modal from 'react-native-modal';
import { BNToHex, hexToBN } from '../../../util/number';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import { resetTransaction } from '../../../actions/transaction';
import { connect } from 'react-redux';
import NotificationManager from '../../../core/NotificationManager';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { getTransactionReviewActionKey, getNormalizedTxState } from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';
import { safeToChecksumAddress } from '../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';

const REVIEW = 'review';
const EDIT = 'edit';
const APPROVAL = 'Approval';

const styles = StyleSheet.create({
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * PureComponent that manages transaction approval from the dapp browser
 */
class Approval extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('approval.title', navigation);

	static propTypes = {
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Action that cleans transaction state
		 */
		resetTransaction: PropTypes.func.isRequired,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * List of transactions
		 */
		transactions: PropTypes.array,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Hides or shows the dApp transaction modal
		 */
		toggleDappTransactionModal: PropTypes.func,
		/**
		 * Tells whether or not dApp transaction modal is visible
		 */
		dappTransactionModalVisible: PropTypes.bool
	};

	state = {
		mode: REVIEW,
		transactionHandled: false
	};

	componentWillUnmount = () => {
		const { transactionHandled } = this.state;
		const { transaction } = this.props;
		if (!transactionHandled) {
			Engine.context.TransactionController.cancelTransaction(transaction.id);
		}
		Engine.context.TransactionController.hub.removeAllListeners(`${transaction.id}:finished`);
		this.clear();
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: REVIEW, dispatch: this.onModeChange });
		this.trackConfirmScreen();
	};

	/**
	 * Call Analytics to track confirm started event for approval screen
	 */
	trackConfirmScreen = () => {
		Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.TRANSACTIONS_CONFIRM_STARTED, this.getTrackingParams());
	};

	/**
	 * Call Analytics to track confirm started event for approval screen
	 */
	trackEditScreen = async () => {
		const { transaction } = this.props;
		const actionKey = await getTransactionReviewActionKey(transaction);
		Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.TRANSACTIONS_EDIT_TRANSACTION, {
			...this.getTrackingParams(),
			actionKey
		});
	};

	/**
	 * Call Analytics to track cancel pressed
	 */
	trackOnCancel = () => {
		Analytics.trackEventWithParameters(
			ANALYTICS_EVENT_OPTS.TRANSACTIONS_CANCEL_TRANSACTION,
			this.getTrackingParams()
		);
	};

	/**
	 * Call Analytics to track confirm pressed
	 */
	trackOnConfirm = () => {
		Analytics.trackEventWithParameters(
			ANALYTICS_EVENT_OPTS.TRANSACTIONS_COMPLETED_TRANSACTION,
			this.getTrackingParams()
		);
	};

	/**
	 * Returns corresponding tracking params to send
	 *
	 * @return {object} - Object containing view, network, activeCurrency and assetType
	 */
	getTrackingParams = () => {
		const {
			networkType,
			transaction: { selectedAsset, assetType }
		} = this.props;
		return {
			view: APPROVAL,
			network: networkType,
			activeCurrency: selectedAsset.symbol || selectedAsset.contractName,
			assetType
		};
	};

	/**
	 * Transaction state is erased, ready to create a new clean transaction
	 */
	clear = () => {
		this.props.resetTransaction();
	};

	showWalletConnectNotification = (confirmation = false) => {
		const { transaction } = this.props;
		InteractionManager.runAfterInteractions(() => {
			transaction.origin === WALLET_CONNECT_ORIGIN &&
				NotificationManager.showSimpleNotification({
					status: `simple_notification${!confirmation ? '_rejected' : ''}`,
					duration: 5000,
					title: confirmation
						? strings('notifications.wc_sent_tx_title')
						: strings('notifications.wc_sent_tx_rejected_title'),
					description: strings('notifications.wc_description')
				});
		});
	};

	onCancel = () => {
		this.props.toggleDappTransactionModal();
		this.state.mode === REVIEW && this.trackOnCancel();
		this.showWalletConnectNotification();
	};

	/**
	 * Callback on confirm transaction
	 */
	onConfirm = async () => {
		const { TransactionController } = Engine.context;
		const {
			transactions,
			transaction: { assetType, selectedAsset }
		} = this.props;
		let { transaction } = this.props;
		try {
			if (assetType === 'ETH') {
				transaction = this.prepareTransaction(transaction);
			} else {
				transaction = this.prepareAssetTransaction(transaction, selectedAsset);
			}

			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				if (transactionMeta.status === 'submitted') {
					this.setState({ transactionHandled: true });
					this.props.toggleDappTransactionModal();
					NotificationManager.watchSubmittedTransaction({
						...transactionMeta,
						assetType: transaction.assetType
					});
				} else {
					throw transactionMeta.error;
				}
			});

			const fullTx = transactions.find(({ id }) => id === transaction.id);
			const updatedTx = { ...fullTx, transaction };
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transaction.id);
			this.showWalletConnectNotification(true);
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [
				{ text: strings('navigation.ok') }
			]);
			this.setState({ transactionHandled: false });
		}
		this.trackOnConfirm();
	};

	/**
	 * Handle approval mode change
	 * If changed to 'review' sends an Analytics track event
	 *
	 * @param mode - Transaction mode, review or edit
	 */
	onModeChange = mode => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode });
		this.setState({ mode });
		InteractionManager.runAfterInteractions(() => {
			mode === REVIEW && this.trackConfirmScreen();
			mode === EDIT && this.trackEditScreen();
		});
	};

	/**
	 * Returns transaction object with gas, gasPrice and value in hex format
	 *
	 * @param {object} transaction - Transaction object
	 */
	prepareTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: BNToHex(transaction.value),
		to: safeToChecksumAddress(transaction.to)
	});

	/**
	 * Returns transaction object with gas and gasPrice in hex format, value set to 0 in hex format
	 * and to set to selectedAsset address
	 *
	 * @param {object} transaction - Transaction object
	 * @param {object} selectedAsset - Asset object
	 */
	prepareAssetTransaction = (transaction, selectedAsset) => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice),
		value: '0x0',
		to: selectedAsset.address
	});

	sanitizeTransaction(transaction) {
		transaction.gas = hexToBN(transaction.gas);
		transaction.gasPrice = hexToBN(transaction.gasPrice);
		transaction.value = hexToBN(transaction.value);
		return transaction;
	}

	render = () => {
		const { transaction, dappTransactionModalVisible } = this.props;
		const { mode } = this.state;
		return (
			<Modal
				isVisible={dappTransactionModalVisible}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onCancel}
				onBackButtonPress={this.onCancel}
				onSwipeComplete={this.onCancel}
				swipeDirection={'down'}
				propagateSwipe
			>
				<TransactionEditor
					promptedFromApproval
					mode={mode}
					onCancel={this.onCancel}
					onConfirm={this.onConfirm}
					onModeChange={this.onModeChange}
					transaction={transaction}
					navigation={this.props.navigation}
					dappTransactionModalVisible={dappTransactionModalVisible}
				/>
			</Modal>
		);
	};
}

const mapStateToProps = state => ({
	transaction: getNormalizedTxState(state),
	transactions: state.engine.backgroundState.TransactionController.transactions,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	resetTransaction: () => dispatch(resetTransaction())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approval);
