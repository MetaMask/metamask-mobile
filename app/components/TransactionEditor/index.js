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

	/**
	 * Call callback when transaction is cancelled
	 */
	onCancel = () => {
		const { onCancel } = this.props;
		onCancel && onCancel();
	};

	/**
	 * Call callback when transaction is confirmed, after being validated
	 */
	onConfirm = async () => {
		const { onConfirm } = this.props;
		!(await this.validate()) && onConfirm && onConfirm();
	};

	/**
	 * Estimates gas limit
	 *
	 * @param {object} opts - Object containing optional attributes object to calculate gas with (amount, data and to)
	 * @returns {object} - Object containing gas estimation
	 */
	estimateGas = async opts => {
		const { TransactionController } = Engine.context;
		const {
			transaction: { from, selectedAsset },
			transaction
		} = this.props;
		const { amount = transaction.value, data = transaction.data, to = transaction.to } = opts;
		let estimation;
		try {
			estimation = await TransactionController.estimateGas({
				amount,
				from,
				data,
				to: selectedAsset ? selectedAsset.address : to
			});
		} catch (e) {
			estimation = { gas: '0x5208' };
		}
		return estimation;
	};

	/**
	 * Updates gas and gasPrice in transaction state
	 *
	 * @param {object} gasLimit - BN object containing gasLimit value
	 * @param {object} gasPrice - BN object containing gasPrice value
	 */
	handleGasFeeSelection = (gasLimit, gasPrice) => {
		this.props.setTransactionObject({ gas: gasLimit, gasPrice });
	};

	/**
	 * Updates value in transaction state
	 * If is an asset transaction it generates data to send and estimates gas again with new value and new data
	 *
	 * @param {object} amount - BN object containing transaction amount
	 */
	handleUpdateAmount = async amount => {
		const {
			transaction: { to, data, assetType }
		} = this.props;

		// If ETH transaction, there is no need to generate new data
		if (assetType === 'ETH') {
			const { gas } = await this.estimateGas({ amount, data, to });
			this.props.setTransactionObject({ value: amount, to, gas: hexToBN(gas) });
		}
		// If selectedAsset defined, generates data
		else if (assetType === 'ERC20') {
			const { data, gas } = await this.handleDataGeneration({ value: amount });
			this.props.setTransactionObject({ value: amount, to, gas: hexToBN(gas), data });
		}
	};

	/**
	 * Updates readableValue in state
	 *
	 * @param {string} readableValue - String containing the readable value
	 */
	handleUpdateReadableValue = readableValue => {
		this.setState({ readableValue });
	};

	/**
	 * Updates data in transaction state, after gas is estimated according to this data
	 *
	 * @param {string} data - String containing new data
	 */
	handleUpdateData = async data => {
		const { gas } = await this.estimateGas({ data });
		this.props.setTransactionObject({ gas: hexToBN(gas), data });
	};

	/**
	 * Updates from in transaction state
	 *
	 * @param {string} from - String containing from address
	 */
	handleUpdateFromAddress = from => {
		this.props.setTransactionObject({ from });
	};

	/**
	 * Updates to in transaction object
	 * If is an asset transaction it generates data to send and estimates gas again with new value and new data
	 *
	 * @param {string} to - String containing to address
	 */
	handleUpdateToAddress = async to => {
		const {
			transaction: { data, assetType }
		} = this.props;
		// If ETH transaction, there is no need to generate new data
		if (assetType === 'ETH') {
			const { gas } = await this.estimateGas({ data, to });
			this.props.setTransactionObject({ to, gas: hexToBN(gas) });
		}
		// If selectedAsset defined, generates data
		else {
			const { data, gas } = await this.handleDataGeneration({ to });
			this.props.setTransactionObject({ to, gas: hexToBN(gas), data });
		}
	};

	/**
	 * Updates selectedAsset in transaction state
	 *
	 * @param {object} asset - New asset to send in transaction
	 */
	handleUpdateAsset = async asset => {
		const { transaction } = this.props;
		if (asset.symbol === 'ETH') {
			const { gas } = await this.estimateGas({ to: transaction.to });
			this.props.setTransactionObject({
				value: undefined,
				data: undefined,
				selectedAsset: { symbol: 'ETH' },
				gas: hexToBN(gas)
			});
		} else {
			const { data, gas } = await this.handleDataGeneration({ selectedAsset: asset });
			this.props.setTransactionObject({ value: undefined, data, selectedAsset: asset, gas: hexToBN(gas) });
		}
	};

	/**
	 * Handle data generation is selectedAsset is defined in transaction
	 *
	 * @param {object} opts? - Optional object to customize data generation, containing selectedAsset, value and to
	 * @returns {object} - Object containing data and gas, according to new generated data
	 */
	handleDataGeneration = async opts => {
		const {
			transaction: { from },
			transaction
		} = this.props;
		const selectedAsset = opts.selectedAsset ? opts.selectedAsset : transaction.selectedAsset;
		const assetType = selectedAsset.tokenId ? 'ERC721' : 'ERC20';
		const value = opts.value ? opts.value : transaction.value;
		const to = opts.to ? opts.to : transaction.to;
		const generateData = {
			ERC20: () => {
				const tokenAmountToSend = selectedAsset && value && value.toString(16);
				return to && tokenAmountToSend
					? generateTransferData('ERC20', { toAddress: to, amount: tokenAmountToSend })
					: undefined;
			},
			ERC721: () =>
				to &&
				generateTransferData('ERC721', {
					fromAddress: from,
					toAddress: to,
					tokenId: selectedAsset.tokenId
				})
		};
		const data = generateData[assetType]();
		const { gas } = await this.estimateGas({ data, to: selectedAsset.address });
		return { data, gas };
	};

	/**
	 * Validates amount, gas and to address
	 *
	 * @returns {boolean} - Whether the transaction is valid or not
	 */
	validate = async () => {
		if ((await this.validateAmount(false)) || this.validateGas() || this.validateToAddress()) {
			return true;
		}
		return false;
	};

	/**
	 * Validates amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateAmount = async (allowEmpty = true) => {
		const {
			transaction: { assetType }
		} = this.props;
		const validations = {
			ETH: () => this.validateEtherAmount(allowEmpty),
			ERC20: () => this.validateTokenAmount(allowEmpty),
			ERC721: async () => await this.validateCollectibleOwnership()
		};
		return await validations[assetType]();
	};

	validateCollectibleOwnership = async () => {
		const { AssetsContractController } = Engine.context;
		const {
			transaction: {
				selectedAsset: { address, tokenId }
			}
		} = this.props;
		const { selectedAddress } = this.props;
		try {
			const owner = await AssetsContractController.getOwnerOf(address, tokenId);
			const isOwner = owner.toLowerCase() === selectedAddress.toLowerCase();
			if (!isOwner) {
				return strings('transaction.invalid_collectible_ownership');
			}
			return undefined;
		} catch (e) {
			return false;
		}
	};

	/**
	 * Validates Ether transaction amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
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

	/**
	 * Validates asset (ERC20) transaction amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateTokenAmount = (allowEmpty = true) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, gas, gasPrice, from, selectedAsset },
				contractBalances
			} = this.props;
			const checksummedFrom = from ? toChecksumAddress(from) : '';
			const fromAccount = this.props.accounts[checksummedFrom];
			if (!value || !gas || !gasPrice || !from) {
				return strings('transaction.invalid_amount');
			}
			const contractBalanceForAddress = hexToBN(contractBalances[selectedAsset.address].toString(16));
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

	/**
	 * Validates transaction gas
	 *
	 * @returns {string} - String containing error message whether the transaction gas is valid or not
	 */
	validateGas = () => {
		let error;
		const {
			transaction: { gas, gasPrice, from }
		} = this.props;
		!gas && (error = strings('transaction.invalid_gas'));
		gas && !isBN(gas) && (error = strings('transaction.invalid_gas'));
		!gasPrice && (error = strings('transaction.invalid_gas_price'));
		gasPrice && !isBN(gasPrice) && (error = strings('transaction.invalid_gas_price'));
		(gas.lt(new BN(21000)) || gas.gt(new BN(7920028))) && (error = strings('custom_gas.warning_gas_limit'));

		const checksummedFrom = from ? toChecksumAddress(from) : '';
		const fromAccount = this.props.accounts[checksummedFrom];
		fromAccount &&
			isBN(gas) &&
			isBN(gasPrice) &&
			hexToBN(fromAccount.balance).lt(gas.mul(gasPrice)) &&
			(error = strings('transaction.insufficient'));
		return error;
	};

	/**
	 * Validates transaction to address
	 *
	 * @returns {string} - String containing error message whether the transaction to address is valid or not
	 */
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
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransactionEditor);
