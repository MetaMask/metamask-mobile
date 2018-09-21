import React, { Component } from 'react';
import Engine from '../../core/Engine';
import TransactionEditor from '../TransactionEditor';
import { Alert, StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import { BNToHex, hexToBN } from '../../util/number';
import { withNavigation } from 'react-navigation';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingTop: 30
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendScreen extends Component {
	state = {
		mode: 'edit',
		transaction: undefined,
		transactionKey: undefined
	};

	async reset() {
		const transaction = {};
		const { gas, gasPrice } = await Engine.context.TransactionController.estimateGas(transaction);
		transaction.gas = gas;
		transaction.gasPrice = gasPrice;
		return this.setState({ mode: 'edit', transaction, transactionKey: Date.now() });
	}

	componentDidMount() {
		this.reset();
	}

	onCancel = async () => {
		this.reset();
	};

	onConfirm = async transaction => {
		const { TransactionController } = Engine.context;
		transaction = this.prepareTransaction(transaction);
		try {
			const { result, transactionMeta } = await TransactionController.addTransaction(transaction);
			await TransactionController.approveTransaction(transactionMeta.id);
			const hash = await result;
			Alert.alert('Transaction success', hash, [{ text: 'OK' }]);
			this.reset();
		} catch (error) {
			Alert.alert('Transaction error', error, [{ text: 'OK' }]);
		}
	};

	onModeChange = mode => {
		this.setState({ mode });
	};

	prepareTransaction(transaction) {
		transaction.gas = BNToHex(transaction.gas);
		transaction.gasPrice = BNToHex(transaction.gasPrice);
		transaction.value = BNToHex(transaction.value);
		return transaction;
	}

	sanitizeTransaction(transaction) {
		transaction.gas = hexToBN(transaction.gas);
		transaction.gasPrice = hexToBN(transaction.gasPrice);
		return transaction;
	}

	render() {
		const { transaction, transactionKey } = this.state;
		return (
			<View style={styles.wrapper}>
				{transaction && (
					<TransactionEditor
						key={transactionKey}
						hideData
						mode={this.state.mode}
						onCancel={this.onCancel}
						onConfirm={this.onConfirm}
						onModeChange={this.onModeChange}
						transaction={this.sanitizeTransaction(transaction)}
					/>
				)}
			</View>
		);
	}
}

export default withNavigation(SendScreen);
