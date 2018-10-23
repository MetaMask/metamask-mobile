import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { withNavigation } from 'react-navigation';
import { colors } from '../../styles/common';
import Engine from '../../core/Engine';
import TransactionEditor from '../TransactionEditor';
import { toBN, BNToHex, hexToBN } from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		paddingTop: 30
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class SendScreen extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	state = {
		mode: 'edit',
		transaction: undefined,
		transactionKey: undefined,
		ready: false
	};

	async reset() {
		const transaction = {};
		const { gas, gasPrice } = await Engine.context.TransactionController.estimateGas(transaction);
		transaction.gas = toBN(gas);
		transaction.gasPrice = toBN(gasPrice);
		return this.setState({ mode: 'edit', transaction, transactionKey: Date.now() });
	}

	checkForDeeplinks() {
		const { navigation } = this.props;
		if (navigation) {
			const txMeta = navigation.getParam('txMeta', null);
			if (txMeta) {
				this.handleNewTxMeta(txMeta);
			}
		}

		this.setState({ ready: true });
	}

	async componentDidMount() {
		await this.reset();
		this.checkForDeeplinks();
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;
		if (prevNavigation && navigation) {
			const prevTxMeta = prevNavigation.getParam('txMeta', null);
			const currentTxMeta = navigation.getParam('txMeta', null);
			if (
				currentTxMeta &&
				currentTxMeta.source &&
				(!prevTxMeta.source || prevTxMeta.source !== currentTxMeta.source)
			) {
				this.handleNewTxMeta(currentTxMeta);
			}
		}
	}

	handleNewTxMeta = ({
		target_address,
		chain_id = null, // eslint-disable-line no-unused-vars
		function_name = null, // eslint-disable-line no-unused-vars
		parameters = null
	}) => {
		const newTxMeta = this.state.transaction;
		newTxMeta.to = toChecksumAddress(target_address);

		if (parameters) {
			const { value, gas, gasPrice } = parameters;
			if (value) {
				newTxMeta.value = toBN(value);
			}
			if (gas) {
				newTxMeta.gas = toBN(gas);
			}
			if (gasPrice) {
				newTxMeta.gasPrice = toBN(gas);
			}

			// TODO: We should add here support for sending tokens
			// or calling smart contract functions
		}
		this.setState({ transaction: newTxMeta });
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

	onCancel = id => {
		Engine.context.TransactionController.cancelTransaction(id);
		this.setState({ mode: 'edit' });
	};

	onConfirm = async transaction => {
		const { TransactionController } = Engine.context;
		transaction = this.prepareTransaction(transaction);
		try {
			const { result, transactionMeta } = await TransactionController.addTransaction(transaction);
			await TransactionController.approveTransaction(transactionMeta.id);
			const hash = await result;
			this.props.navigation.push('TransactionSubmitted', { hash });
			this.reset();
		} catch (error) {
			Alert.alert('Transaction error', JSON.stringify(error), [{ text: 'OK' }]);
		}
	};

	onModeChange = mode => {
		this.setState({ mode });
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	render() {
		return (
			<View style={styles.wrapper}>
				{this.state.ready ? (
					<TransactionEditor
						mode={this.state.mode}
						onCancel={this.onCancel}
						onConfirm={this.onConfirm}
						onModeChange={this.onModeChange}
						onScanSuccess={this.handleNewTxMeta}
						transaction={this.state.transaction}
					/>
				) : (
					this.renderLoader()
				)}
			</View>
		);
	}
}

export default withNavigation(SendScreen);
