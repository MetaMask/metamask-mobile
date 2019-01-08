import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';
import TransactionReview from '../TransactionReview';
import TransactionEdit from '../TransactionEdit';
import { isBN, hexToBN, toBN, toWei, fromWei, calcTokenValueToSend } from '../../util/number';
import { isValidAddress, toChecksumAddress, BN } from 'ethereumjs-util';
import { strings } from '../../../locales/i18n';
import { connect } from 'react-redux';
import { generateTransferData } from '../../util/transactions';

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
		 * Object containing accounts balances
		 */
		contractBalances: PropTypes.object
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
		const { amount, gas, gasPrice, data, from, to } = this.state;
		const { onConfirm, transaction } = this.props;
		!this.validate() &&
			onConfirm &&
			onConfirm({
				...transaction,
				...{ value: amount, data, from, gas, gasPrice, to }
			});
	};

	estimateGas = async opts => {
		const { TransactionController } = Engine.context;
		const {
			transaction: { asset }
		} = this.props;
		const { from } = this.state;
		const { amount = this.state.amount, data = this.state.data, to = this.state.to } = opts;
		let estimation;
		try {
			estimation = await TransactionController.estimateGas({
				amount,
				from,
				data,
				to: asset ? asset.address : to
			});
		} catch (e) {
			estimation = { gas: '0x5208' };
		}
		return estimation;
	};

	handleGasFeeSelection = (gasLimit, gasPrice) => {
		this.setState({ gas: gasLimit, gasPrice });
	};

	handleUpdateAmount = async amount => {
		const { to, data } = this.state;
		const {
			transaction: { asset }
		} = this.props;
		const tokenAmountToSend = asset && calcTokenValueToSend(fromWei(amount), asset.decimals);
		const newData =
			to && asset ? generateTransferData('ERC20', { toAddress: to, amount: tokenAmountToSend }) : data;
		const amountToSend = asset ? '0x0' : amount;
		const { gas } = await this.estimateGas({ amount: amountToSend, newData });
		this.setState({ amount: amountToSend, data: newData, gas: hexToBN(gas) });
	};

	handleUpdateData = async data => {
		const { gas } = await this.estimateGas({ data });
		this.setState({ data, gas: hexToBN(gas) });
	};

	handleUpdateFromAddress = from => {
		this.setState({ from });
	};

	handleUpdateToAddress = async to => {
		const { amount, data } = this.state;
		const {
			transaction: { asset }
		} = this.props;
		const tokenAmountToSend = asset && calcTokenValueToSend(fromWei(amount), asset.decimals);
		const newData = asset ? generateTransferData('ERC20', { toAddress: to, amount: tokenAmountToSend }) : data;
		const { gas } = await this.estimateGas({ data: newData, to: asset ? asset.address : to });
		this.setState({ to, gas: hexToBN(gas), data: newData });
	};

	validate = () => {
		if (this.validateAmount() || this.validateGas() || this.validateToAddress()) {
			return true;
		}
	};

	validateAmount = () => {
		const {
			transaction: { asset }
		} = this.props;
		return asset ? this.validateTokenAmount() : this.validateEtherAmount();
	};

	validateEtherAmount = () => {
		let error;
		const { amount, gas, gasPrice, from } = this.state;
		const checksummedFrom = from ? toChecksumAddress(from) : '';
		const fromAccount = this.props.accounts[checksummedFrom];
		(!amount || !gas || !gasPrice || !from) && (error = strings('transaction.invalid_amount'));
		amount && !isBN(amount) && (error = strings('transaction.invalid_amount'));
		amount &&
			fromAccount &&
			isBN(gas) &&
			isBN(gasPrice) &&
			isBN(amount) &&
			hexToBN(fromAccount.balance).lt(amount.add(gas.mul(gasPrice))) &&
			(error = strings('transaction.insufficient'));
		return error;
	};

	validateTokenAmount = () => {
		let error;
		const { amount, gas, gasPrice, from } = this.state;
		const {
			transaction: { asset },
			contractBalances
		} = this.props;
		const checksummedFrom = from ? toChecksumAddress(from) : '';
		const fromAccount = this.props.accounts[checksummedFrom];
		if (!amount || !gas || !gasPrice || !from) {
			return strings('transaction.invalid_amount');
		}
		const validateAssetAmount = toWei(contractBalances[asset.address]).lt(amount);
		const ethTotalAmount = gas.mul(gasPrice);
		amount &&
			fromAccount &&
			isBN(gas) &&
			isBN(gasPrice) &&
			(validateAssetAmount || hexToBN(fromAccount.balance).lt(ethTotalAmount)) &&
			(error = strings('transaction.insufficient'));
		return error;
	};

	validateGas = () => {
		let error;
		const { gas, gasPrice } = this.state;
		!gas && (error = strings('transaction.invalid_gas'));
		gas && !isBN(gas) && (error = strings('transaction.invalid_gas'));
		!gasPrice && (error = strings('transaction.invalid_gas_price'));
		gasPrice && !isBN(gasPrice) && (error = strings('transaction.invalid_gas_price'));
		(gas.lt(new BN(21000)) || gas.gt(new BN(7920028))) && (error = strings('custom_gas.warning_gas_limit'));
		return error;
	};

	validateToAddress = () => {
		let error;
		const { to } = this.state;
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
		const {
			mode,
			transaction: { asset }
		} = this.props;
		const transactionData = { amount, gas, gasPrice, from, to, data, asset };

		return (
			<View style={styles.root}>
				{mode === 'edit' && (
					<TransactionEdit
						accounts={this.props.accounts}
						navigation={this.props.navigation}
						onCancel={this.onCancel}
						onModeChange={this.props.onModeChange}
						onScanSuccess={this.handleNewTxMeta}
						handleUpdateAmount={this.handleUpdateAmount}
						handleUpdateData={this.handleUpdateData}
						handleUpdateFromAddress={this.handleUpdateFromAddress}
						handleUpdateToAddress={this.handleUpdateToAddress}
						handleGasFeeSelection={this.handleGasFeeSelection}
						transactionData={transactionData}
						validateAmount={this.validateAmount}
						validateGas={this.validateGas}
						validateToAddress={this.validateToAddress}
					/>
				)}
				{mode === 'review' && (
					<TransactionReview
						accounts={this.props.accounts}
						onCancel={this.onCancel}
						onConfirm={this.onConfirm}
						onModeChange={this.props.onModeChange}
						transactionData={transactionData}
						validateAmount={this.validateAmount}
					/>
				)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances
});

export default connect(mapStateToProps)(TransactionEditor);
