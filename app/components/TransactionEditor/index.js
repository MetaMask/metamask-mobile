import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import TransactionReview from '../TransactionReview';
import TransactionEdit from '../TransactionEdit';
import { isBN, hexToBN, toBN } from '../../util/number';
import { isValidAddress, toChecksumAddress, BN } from 'ethereumjs-util';
import { strings } from '../../../locales/i18n';
import { connect } from 'react-redux';
import { generateTransferData } from '../../util/transactions';
import { setTransactionObject } from '../../actions/transaction';

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
		transaction: PropTypes.object,
		/**
		 * Whether the transaction was confirmed or not
		 */
		transactionConfirmed: PropTypes.bool,
		/**
		 * Object containing accounts balances
		 */
		contractBalances: PropTypes.object,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired
	};

	state = {
		toFocused: false,
		readableValue: undefined
	};

	onCancel = () => {
		const { onCancel } = this.props;
		onCancel && onCancel();
	};

	onConfirm = () => {
		const { onConfirm } = this.props;
		!this.validate() && onConfirm && onConfirm();
	};

	estimateGas = async opts => {
		const { TransactionController } = Engine.context;
		const {
			transaction: { from, selectedToken },
			transaction
		} = this.props;
		const { amount = transaction.amount, data = transaction.data, to = transaction.to } = opts;
		let estimation;
		try {
			estimation = await TransactionController.estimateGas({
				amount,
				from,
				data,
				to: selectedToken ? selectedToken.address : to
			});
		} catch (e) {
			estimation = { gas: '0x5208' };
		}
		return estimation;
	};

	handleGasFeeSelection = (gasLimit, gasPrice) => {
		this.props.setTransactionObject({ gas: gasLimit, gasPrice });
	};

	handleUpdateAmount = async amount => {
		const {
			transaction: { to, data, selectedToken }
		} = this.props;
		const tokenAmountToSend = selectedToken && amount && amount.toString(16);
		const newData =
			to && selectedToken && tokenAmountToSend
				? generateTransferData('ERC20', { toAddress: to, amount: tokenAmountToSend })
				: data;
		const amountToSend = selectedToken ? '0x0' : amount;
		const { gas } = await this.estimateGas({ amount: amountToSend, data: newData });
		this.props.setTransactionObject({ value: amount, gas: hexToBN(gas), data: newData });
	};

	handleUpdateReadableValue = readableValue => {
		this.setState({ readableValue });
	};

	handleUpdateData = async data => {
		const { gas } = await this.estimateGas({ data });
		this.props.setTransactionObject({ gas: hexToBN(gas), data });
	};

	handleUpdateFromAddress = from => {
		this.props.setTransactionObject({ from });
	};

	handleUpdateToAddress = async to => {
		const {
			transaction: { selectedToken, value, data }
		} = this.props;
		const tokenAmountToSend = selectedToken && value && value.toString(16);
		const newData =
			selectedToken && tokenAmountToSend
				? generateTransferData('ERC20', { toAddress: to, amount: tokenAmountToSend })
				: data;
		const { gas } = await this.estimateGas({ data: newData, to: selectedToken ? selectedToken.address : to });
		this.props.setTransactionObject({ to, gas: hexToBN(gas), data: newData });
	};

	handleUpdateAsset = async asset => {
		const { transaction } = this.props;
		this.props.setTransactionObject({ value: undefined, data: undefined, selectedToken: asset });
		await this.handleUpdateToAddress(transaction.to);
	};

	validate = () => {
		if (this.validateAmount(false) || this.validateGas() || this.validateToAddress()) {
			return true;
		}
	};

	validateAmount = (allowEmpty = true) => {
		const {
			transaction: { selectedToken }
		} = this.props;
		return selectedToken ? this.validateTokenAmount(allowEmpty) : this.validateEtherAmount(allowEmpty);
	};

	validateEtherAmount = (allowEmpty = true) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, gas, gasPrice, from }
			} = this.props;
			const checksummedFrom = from ? toChecksumAddress(from) : '';
			const fromAccount = this.props.accounts[checksummedFrom];
			(!value || !gas || !gasPrice || !from) && (error = strings('transaction.invalid_amount'));
			value && !isBN(value) && (error = strings('transaction.invalid_amount'));
			value &&
				fromAccount &&
				isBN(gas) &&
				isBN(gasPrice) &&
				isBN(value) &&
				hexToBN(fromAccount.balance).lt(value.add(gas.mul(gasPrice))) &&
				(error = strings('transaction.insufficient'));
		}
		return error;
	};

	validateTokenAmount = (allowEmpty = true) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, gas, gasPrice, from, selectedToken },
				contractBalances
			} = this.props;
			const checksummedFrom = from ? toChecksumAddress(from) : '';
			const fromAccount = this.props.accounts[checksummedFrom];
			if (!value || !gas || !gasPrice || !from) {
				return strings('transaction.invalid_amount');
			}
			const contractBalanceForAddress = hexToBN(contractBalances[selectedToken.address].toString(16));
			value && !isBN(value) && (error = strings('transaction.invalid_amount'));
			const validateAssetAmount = contractBalanceForAddress.lt(value);
			const ethTotalAmount = gas.mul(gasPrice);
			value &&
				fromAccount &&
				isBN(gas) &&
				isBN(gasPrice) &&
				(validateAssetAmount || hexToBN(fromAccount.balance).lt(ethTotalAmount)) &&
				(error = strings('transaction.insufficient'));
		}
		return error;
	};

	validateGas = () => {
		let error;
		const {
			transaction: { gas, gasPrice }
		} = this.props;
		!gas && (error = strings('transaction.invalid_gas'));
		gas && !isBN(gas) && (error = strings('transaction.invalid_gas'));
		!gasPrice && (error = strings('transaction.invalid_gas_price'));
		gasPrice && !isBN(gasPrice) && (error = strings('transaction.invalid_gas_price'));
		(gas.lt(new BN(21000)) || gas.gt(new BN(7920028))) && (error = strings('custom_gas.warning_gas_limit'));
		return error;
	};

	validateToAddress = () => {
		let error;
		const {
			transaction: { to }
		} = this.props;
		!to && (error = strings('transaction.required'));
		!to && this.state.toFocused && (error = strings('transaction.required'));
		to && !isValidAddress(to) && (error = strings('transaction.invalid_address'));
		return error;
	};

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
				this.props.setTransactionObject({ gas: toBN(gas) });
				this.setState({ gas: toBN(gas) });
			}
			if (gasPrice) {
				this.props.setTransactionObject({ gasPrice: toBN(gasPrice) });
				this.setState({ gasPrice: toBN(gasPrice) });
			}

			// TODO: We should add here support for:
			// - sending tokens (function_name + parameters.data)
			// - calling smart contract functions (function_name + parameters.data)
			// - chain_id ( switch to the specific network )
		}
	};

	render = () => {
		const { readableValue } = this.state;
		const { mode, transactionConfirmed } = this.props;
		return (
			<View style={styles.root}>
				{mode === 'edit' && (
					<TransactionEdit
						navigation={this.props.navigation}
						onCancel={this.onCancel}
						onModeChange={this.props.onModeChange}
						onScanSuccess={this.handleNewTxMeta}
						handleUpdateAmount={this.handleUpdateAmount}
						handleUpdateData={this.handleUpdateData}
						handleUpdateFromAddress={this.handleUpdateFromAddress}
						handleUpdateToAddress={this.handleUpdateToAddress}
						handleGasFeeSelection={this.handleGasFeeSelection}
						validateAmount={this.validateAmount}
						validateGas={this.validateGas}
						validateToAddress={this.validateToAddress}
						handleUpdateAsset={this.handleUpdateAsset}
						readableValue={readableValue}
						handleUpdateReadableValue={this.handleUpdateReadableValue}
					/>
				)}
				{mode === 'review' && (
					<TransactionReview
						onCancel={this.onCancel}
						onConfirm={this.onConfirm}
						onModeChange={this.props.onModeChange}
						validateAmount={this.validateAmount}
						transactionConfirmed={transactionConfirmed}
					/>
				)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransactionEditor);
