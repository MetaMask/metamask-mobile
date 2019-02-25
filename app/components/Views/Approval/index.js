import React, { Component } from 'react';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../../UI/TransactionEditor';
import { BNToHex, hexToBN } from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import { colors } from '../../../styles/common';
import { newTransaction, setTransactionObject } from '../../../actions/transaction';
import { connect } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';

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
	static navigationOptions = ({ navigation }) =>
		getTransactionOptionsTitle(strings('approval.title'), strings('navigation.cancel'), navigation);

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
		transaction: PropTypes.object.isRequired
	};

	state = {
		mode: 'review',
		transactionHandled: false
	};

	componentWillUnmount = () => {
		const { transactionHandled } = this.state;
		const { transaction } = this.props;
		if (!transactionHandled) {
			Engine.context.TransactionController.cancelTransaction(transaction.id);
		}
		this.clear();
	};

	/**
	 * Transaction state is erased, ready to create a new clean transaction
	 */
	clear = () => {
		this.props.newTransaction();
	};

	onCancel = () => {
		this.props.navigation.goBack();
	};

	/**
	 * Callback on confirm transaction
	 */
	onConfirm = async () => {
		const { TransactionController } = Engine.context;
		const { transactions } = this.props;
		let { transaction } = this.props;
		try {
			transaction = this.prepareTransaction(transaction);
			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				if (transactionMeta.status === 'submitted') {
					this.setState({ transactionHandled: true });
					this.props.navigation.goBack();
				} else {
					throw transactionMeta.error;
				}
			});

			const fullTx = transactions.find(({ id }) => id === transaction.id);
			const updatedTx = { ...fullTx, transaction };
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transaction.id);
		} catch (error) {
			Alert.alert('Transaction error', JSON.stringify(error), [{ text: 'OK' }]);
			this.setState({ transactionHandled: false });
		}
	};

	onModeChange = mode => {
		this.setState({ mode });
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
		return (
			<SafeAreaView style={styles.wrapper}>
				<TransactionEditor
					mode={this.state.mode}
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
	transactions: state.engine.backgroundState.TransactionController.transactions
});

const mapDispatchToProps = dispatch => ({
	newTransaction: () => dispatch(newTransaction()),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approval);
