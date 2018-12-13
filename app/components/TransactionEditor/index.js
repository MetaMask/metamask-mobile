import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import TransactionReview from '../TransactionReview';
import TransactionEdit from '../TransactionEdit';
import { isBN, hexToBN, toBN } from '../../util/number';
import { isValidAddress, toChecksumAddress } from 'ethereumjs-util';
import { strings } from '../../../locales/i18n';
import { connect } from 'react-redux';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	}
});

/**
 * Component that supports editing and reviewing a transaction
 */
class TransactionEditor extends Component {
	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * react-navigation object used for switching between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Hids the "data" field
		 */
		hideData: PropTypes.bool,
		/**
		 * Current mode this transaction editor is in
		 */
		mode: PropTypes.oneOf(['edit', 'review']),
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onConfirm: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object
	};

	state = {
		amount: this.props.transaction.value,
		data: this.props.transaction.data,
		from: this.props.transaction.from,
		gas: this.props.transaction.gas,
		gasPrice: this.props.transaction.gasPrice,
		to: this.props.transaction.to,
		toFocused: false
	};

	onCancel = () => {
		const { onCancel } = this.props;
		onCancel && onCancel();
	};

	onConfirm = () => {
		const { amount, gas, gasPrice } = this.state;
		const { onConfirm, transaction } = this.props;
		const { data, from, to } = this.state;
		!this.validate() &&
			onConfirm &&
			onConfirm({
				...transaction,
				...{ value: amount, data, from, gas, gasPrice, to }
			});
	};

	handleGasFeeSelection = (gasLimit, gasPrice) => {
		this.setState({ gas: gasLimit, gasPrice });
	};

	handleUpdateAmount = amount => {
		this.setState({ amount });
	};

	handleUpdateData = data => {
		this.setState({ data });
	};

	handleUpdateFromAddress = from => {
		this.setState({ from });
	};

	handleUpdateToAddress = async to => {
		const { TransactionController } = Engine.context;
		const { amount, from, data } = this.state;
		const { gas } = await TransactionController.estimateGas({ amount, from, data, to });
		this.setState({ to, gas: hexToBN(gas) });
	};

	validate() {
		if (this.validateAmount() || this.validateGas() || this.validateToAddress()) {
			return true;
		}
	}

	validateAmount() {
		let error;
		const { amount, gas, gasPrice, from } = this.state;
		const checksummedFrom = from ? toChecksumAddress(from) : '';
		const fromAccount = this.props.accounts[checksummedFrom];
		amount && !isBN(amount) && (error = strings('transaction.invalid_amount'));
		amount &&
			fromAccount &&
			isBN(gas) &&
			isBN(gasPrice) &&
			isBN(amount) &&
			hexToBN(fromAccount.balance).lt(amount.add(gas.mul(gasPrice))) &&
			(error = strings('transaction.insufficient'));
		return error;
	}

	validateGas() {
		let error;
		const { gas, gasPrice } = this.state;
		gas && !isBN(gas) && (error = strings('transaction.invalid_gas'));
		gasPrice && !isBN(gasPrice) && (error = strings('transaction.invalid_gas_price'));
		return error;
	}

	validateToAddress() {
		let error;
		const { to } = this.state;
		!to && this.state.toFocused && (error = strings('transaction.required'));
		to && !isValidAddress(to) && (error = strings('transaction.invalid_address'));
		return error;
	}

	handleNewTxMeta = async ({
		target_address,
		chain_id = null, // eslint-disable-line no-unused-vars
		function_name = null, // eslint-disable-line no-unused-vars
		parameters = null
	}) => {
		await this.handleUpdateToAddress(target_address);

		if (parameters) {
			const { value, gas, gasPrice } = parameters;
			if (value) {
				this.handleUpdateAmount(toBN(value));
			}
			if (gas) {
				this.setState({ gas: toBN(gas) });
			}
			if (gasPrice) {
				this.setState({ gas: toBN(gasPrice) });
			}

			// TODO: We should add here support for:
			// - sending tokens (function_name + parameters.data)
			// - calling smart contract functions (function_name + parameters.data)
			// - chain_id ( switch to the specific network )
		}
	};

	render = () => {
		const { amount, gas, gasPrice, from, to, data } = this.state;
		const transactionData = { amount, gas, gasPrice, from, to, data };
		const { mode } = this.props;

		return (
			<View style={styles.root}>
				{mode === 'edit' && (
					<TransactionEdit
						accounts={this.props.accounts}
						navigation={this.props.navigation}
						hideData={this.props.hideData}
						onCancel={this.onCancel}
						onModeChange={this.props.onModeChange}
						onScanSuccess={this.handleNewTxMeta}
						handleUpdateAmount={this.handleUpdateAmount}
						handleUpdateData={this.handleUpdateData}
						handleUpdateFromAddress={this.handleUpdateFromAddress}
						handleUpdateToAddress={this.handleUpdateToAddress}
						handleGasFeeSelection={this.handleGasFeeSelection}
						transactionData={transactionData}
					/>
				)}
				{mode === 'review' && (
					<TransactionReview
						accounts={this.props.accounts}
						navigation={this.props.navigation}
						hideData={this.props.hideData}
						onCancel={this.onCancel}
						onConfirm={this.onConfirm}
						onModeChange={this.props.onModeChange}
						transactionData={transactionData}
					/>
				)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts
});

export default connect(mapStateToProps)(TransactionEditor);
