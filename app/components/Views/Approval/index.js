import React, { Component } from 'react';
import { SafeAreaView, StyleSheet, Alert, InteractionManager } from 'react-native';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../../UI/TransactionEditor';
import { BNToHex, hexToBN } from '../../../util/number';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import { colors } from '../../../styles/common';
import { newTransaction, setTransactionObject } from '../../../actions/transaction';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';
import { getTransactionReviewActionKey } from '../../../util/transactions';

const REVIEW = 'review';
const EDIT = 'edit';
const APPROVAL = 'Approval';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * Component that manages transaction approval from the dapp browser
 */
class Approval extends Component {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('approval.title', navigation);

	static propTypes = {
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Action that cleans transaction state
		 */
		newTransaction: PropTypes.func.isRequired,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * List of transactions
		 */
		transactions: PropTypes.array,
		/**
		 * Map representing the address book
		 */
		addressBook: PropTypes.array,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string
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
		this.props.newTransaction();
	};

	onCancel = () => {
		this.props.navigation.pop();
		this.state.mode === REVIEW && this.trackOnCancel();
	};

	/**
	 * Callback on confirm transaction
	 */
	onConfirm = async () => {
		const { TransactionController, AddressBookController } = Engine.context;
		const { transactions, addressBook } = this.props;
		let { transaction } = this.props;
		try {
			transaction = this.prepareTransaction(transaction);

			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				// Add to the AddressBook if it's an unkonwn address
				const checksummedAddress = toChecksumAddress(transactionMeta.transaction.to);
				const existingContact = addressBook.find(
					({ address }) => toChecksumAddress(address) === checksummedAddress
				);
				if (!existingContact) {
					AddressBookController.set(checksummedAddress, '');
				}

				if (transactionMeta.status === 'submitted') {
					this.setState({ transactionHandled: true });
					this.props.navigation.pop();
					TransactionsNotificationManager.watchSubmittedTransaction({
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
		} catch (error) {
			Alert.alert('Transaction error', error && error.message, [{ text: 'OK' }]);
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
		to: toChecksumAddress(transaction.to)
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
		const { transaction } = this.props;
		const { mode } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<TransactionEditor
					mode={mode}
					onCancel={this.onCancel}
					onConfirm={this.onConfirm}
					onModeChange={this.onModeChange}
					transaction={transaction}
					navigation={this.props.navigation}
				/>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	transaction: state.transaction,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	newTransaction: () => dispatch(newTransaction()),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approval);
