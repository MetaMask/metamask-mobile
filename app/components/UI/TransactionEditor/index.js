import React, { PureComponent } from 'react';
import { StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import AnimatedTransactionModal from '../AnimatedTransactionModal';
import TransactionReview from '../TransactionReview';
import CustomGas from '../CustomGas';
import { isBN, hexToBN, toBN, fromWei, renderFromWei, toHexadecimal } from '../../../util/number';
import { isValidAddress, toChecksumAddress, BN, addHexPrefix } from 'ethereumjs-util';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
	generateTransferData,
	getNormalizedTxState,
	getTicker,
	getActiveTabUrl,
	parseTransactionEIP1559,
	parseTransactionLegacy
} from '../../../util/transactions';
import { getBasicGasEstimatesByChainId, apiEstimateModifiedToWEI } from '../../../util/custom-gas';
import { setTransactionObject } from '../../../actions/transaction';
import Engine from '../../../core/Engine';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import contractMap from '@metamask/contract-metadata';
import { safeToChecksumAddress } from '../../../util/address';
import TransactionTypes from '../../../core/TransactionTypes';
import { MAINNET } from '../../../constants/network';
import { toLowerCaseEquals } from '../../../util/general';
import EditGasFee1559 from '../EditGasFee1559';
import EditGasFeeLegacy from '../EditGasFeeLegacy';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';

const EDIT = 'edit';
const REVIEW = 'review';

const styles = StyleSheet.create({
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	}
});

/**
 * PureComponent that supports editing and reviewing a transaction
 */
class TransactionEditor extends PureComponent {
	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Current mode this transaction editor is in
		 */
		mode: PropTypes.oneOf([EDIT, REVIEW]),
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Callback triggered when this transaction is confirmed
		 */
		onConfirm: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * Array of ERC721 assets
		 */
		collectibles: PropTypes.array,
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
		 * String containing the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * Whether was prompted from approval
		 */
		promptedFromApproval: PropTypes.bool,
		/**
		 * Current selected ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Active tab URL, the currently active tab url
		 */
		activeTabUrl: PropTypes.string,
		/**
		 * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
		 */
		gasEstimateType: PropTypes.string,
		/**
		 * Gas fee estimates returned by the gas fee controller
		 */
		gasFeeEstimates: PropTypes.object,
		/**
		 * ETH or fiat, depending on user setting
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * A string representing the network chainId
		 */
		chainId: PropTypes.string
	};

	state = {
		toFocused: false,
		ensRecipient: undefined,
		basicGasEstimates: {},
		ready: false,
		data: undefined,
		amountError: '',
		gasError: '',
		toAddressError: '',
		over: false,
		gasSelected: 'medium',
		gasSelectedTemp: 'medium',
		EIP1559GasData: {},
		EIP1559GasDataTemp: {},
		LegacyGasData: {},
		LegacyGasDataTemp: {}
	};

	computeGasEstimates = () => {
		const { transaction, gasEstimateType, gasFeeEstimates } = this.props;
		const { gasSelected, gasSelectedTemp, dappSuggestedGasPrice, dappSuggestedEIP1559Gas } = this.state;

		const dappSuggestedGas = dappSuggestedGasPrice || dappSuggestedEIP1559Gas;

		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			let initialGas, initialGasTemp;
			if (dappSuggestedEIP1559Gas) {
				initialGas = {
					suggestedMaxFeePerGas: fromWei(dappSuggestedEIP1559Gas.maxFeePerGas, 'gwei'),
					suggestedMaxPriorityFeePerGas: fromWei(dappSuggestedEIP1559Gas.maxPriorityFeePerGas, 'gwei')
				};
				initialGasTemp = initialGas;
			} else if (dappSuggestedGasPrice) {
				initialGas = {
					suggestedMaxFeePerGas: fromWei(dappSuggestedGasPrice, 'gwei'),
					suggestedMaxPriorityFeePerGas: fromWei(dappSuggestedGasPrice, 'gwei')
				};
				initialGasTemp = initialGas;
			} else {
				initialGas = gasFeeEstimates[gasSelected];
				initialGasTemp = gasFeeEstimates[gasSelectedTemp];
			}

			const suggestedGasLimit = fromWei(transaction.gas, 'wei');

			const EIP1559GasData = this.parseTransactionDataEIP1559({
				...initialGas,
				suggestedGasLimit
			});

			let EIP1559GasDataTemp;
			if (gasSelected === gasSelectedTemp) {
				EIP1559GasDataTemp = EIP1559GasData;
			} else {
				EIP1559GasDataTemp = this.parseTransactionDataEIP1559({
					...initialGasTemp,
					suggestedGasLimit
				});
			}

			// eslint-disable-next-line react/no-did-update-set-state
			this.setState(
				{
					ready: true,
					EIP1559GasData,
					EIP1559GasDataTemp,
					advancedGasInserted: Boolean(dappSuggestedGas),
					gasSelected: dappSuggestedGas ? null : gasSelected,
					animateOnChange: true
				},
				() => {
					this.setState({ animateOnChange: false });
				}
			);
		} else {
			const suggestedGasLimit = fromWei(transaction.gas, 'wei');
			const getGas = selected =>
				dappSuggestedGasPrice
					? fromWei(dappSuggestedGasPrice, 'gwei')
					: gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
					? this.props.gasFeeEstimates[selected]
					: this.props.gasFeeEstimates.gasPrice;

			const LegacyGasData = this.parseTransactionDataLegacy(
				{
					suggestedGasPrice: getGas(this.state.gasSelected),
					suggestedGasLimit
				},
				{ onlyGas: true }
			);

			this.handleGasFeeSelection(
				hexToBN(LegacyGasData.suggestedGasLimitHex),
				hexToBN(LegacyGasData.suggestedGasPriceHex)
			);

			let LegacyGasDataTemp;
			if (this.state.gasSelected === this.state.gasSelectedTemp) {
				LegacyGasDataTemp = LegacyGasData;
			} else {
				LegacyGasDataTemp = this.parseTransactionDataEIP1559({
					suggestedGasPrice: getGas(this.state.gasSelectedTemp),
					suggestedGasLimit
				});
			}

			// eslint-disable-next-line react/no-did-update-set-state
			this.setState(
				{
					ready: true,
					LegacyGasData,
					LegacyGasDataTemp,
					advancedGasInserted: Boolean(dappSuggestedGasPrice),
					gasSelected: dappSuggestedGasPrice ? null : gasSelected,
					animateOnChange: true
				},
				() => {
					this.setState({ animateOnChange: false });
				}
			);
		}
	};

	startPolling = async () => {
		const { GasFeeController } = Engine.context;
		const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(this.state.pollToken);
		this.setState({ pollToken });
	};

	componentDidMount = async () => {
		const { transaction } = this.props;

		const zeroGas = new BN('00');
		const hasGasPrice = Boolean(transaction.gasPrice) && !new BN(transaction.gasPrice).eq(zeroGas);
		const hasGasLimit = Boolean(transaction.gas) && !new BN(transaction.gas).eq(zeroGas);
		const hasEIP1559Gas = Boolean(transaction.maxFeePerGas) && Boolean(transaction.maxPriorityFeePerGas);
		if (!hasGasLimit) this.handleGetGasLimit();

		if (!hasGasPrice && !hasEIP1559Gas) {
			this.startPolling();
		} else if (hasEIP1559Gas) {
			this.setState(
				{
					dappSuggestedEIP1559Gas: {
						maxFeePerGas: transaction.maxFeePerGas,
						maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
					}
				},
				this.startPolling
			);
		} else if (hasGasPrice) {
			this.setState({ dappSuggestedGasPrice: transaction.gasPrice }, this.startPolling);
		}

		if (transaction && transaction.value) {
			this.handleUpdateAmount(transaction.value, true);
		}
		if (transaction && transaction.assetType === 'ETH') {
			this.handleUpdateReadableValue(fromWei(transaction.value));
		}
		if (transaction && transaction.data) {
			this.setState({ data: transaction.data });
		}
	};

	parseTransactionDataEIP1559 = (gasFee, options) => {
		const parsedTransactionEIP1559 = parseTransactionEIP1559(
			{
				...this.props,
				selectedGasFee: { ...gasFee, estimatedBaseFee: this.props.gasFeeEstimates.estimatedBaseFee }
			},
			{ onlyGas: true }
		);

		parsedTransactionEIP1559.error = this.validateTotal(parsedTransactionEIP1559.totalMaxHex);

		return parsedTransactionEIP1559;
	};

	parseTransactionDataLegacy = (gasFee, options) => {
		const parsedTransactionLegacy = parseTransactionLegacy(
			{
				...this.props,
				selectedGasFee: gasFee
			},
			{ onlyGas: true }
		);

		parsedTransactionLegacy.error = this.validateTotal(parsedTransactionLegacy.totalHex);

		return parsedTransactionLegacy;
	};

	shallowEqual = (object1, object2) => {
		const keys1 = Object.keys(object1);
		const keys2 = Object.keys(object2);

		if (keys1.length !== keys2.length) {
			return false;
		}

		for (const key of keys1) {
			if (object1[key] !== object2[key]) {
				return false;
			}
		}

		return true;
	};

	componentDidUpdate = prevProps => {
		const { transaction } = this.props;
		if (transaction.data !== prevProps.transaction.data) {
			this.handleUpdateData(transaction.data);
		}

		if (!this.state.stopUpdateGas && !this.state.advancedGasInserted) {
			if (
				this.props.gasFeeEstimates &&
				transaction.gas &&
				(!this.shallowEqual(prevProps.gasFeeEstimates, this.props.gasFeeEstimates) ||
					!transaction.gas.eq(prevProps?.transaction?.gas))
			) {
				this.computeGasEstimates();
			}
		}
	};

	componentWillUnmount = () => {
		const { GasFeeController } = Engine.context;
		GasFeeController.stopPolling(this.state.pollToken);
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
		const { onConfirm, gasEstimateType } = this.props;
		const { EIP1559GasData } = this.state;
		!(await this.validate()) && onConfirm && onConfirm({ gasEstimateType, EIP1559GasData });
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
				to: selectedAsset && selectedAsset.address ? selectedAsset.address : to
			});
		} catch (e) {
			estimation = { gas: TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT };
		}
		return estimation;
	};

	/**
	 * Updates gas and gasPrice in transaction state
	 *
	 * @param {object} gasLimit - BN object containing gasLimit value
	 * @param {object} gasPrice - BN object containing gasPrice value
	 * @param {object} warningGasPriceHigh - string object warning for custom gas price set higher than 'Fast'
	 */
	handleGasFeeSelection = (gasLimit, gasPrice, warningGasPriceHigh) => {
		const transactionObject = {
			gas: gasLimit,
			gasPrice,
			warningGasPriceHigh
		};
		this.props.setTransactionObject(transactionObject);
	};

	/**
	 * Updates value in transaction state
	 * If is an asset transaction it generates data to send and estimates gas again with new value and new data
	 *
	 * @param {object} amount - BN object containing transaction amount
	 * @param {bool} mounting - Whether the view is mounting, in that case it should use the gas from transaction state
	 */
	handleUpdateAmount = async (amount, mounting = false) => {
		const {
			transaction: { to, data, assetType, gas: gasLimit }
		} = this.props;
		// If ETH transaction, there is no need to generate new data
		if (assetType === 'ETH') {
			const { gas } = mounting ? { gas: gasLimit } : await this.estimateGas({ amount, data, to });
			this.props.setTransactionObject({ value: amount, to, gas: hexToBN(gas) });
		}
		// If selectedAsset defined, generates data
		else if (assetType === 'ERC20') {
			const res = await this.handleDataGeneration({ value: amount });
			const gas = mounting ? gasLimit : res.gas;
			this.props.setTransactionObject({ value: amount, to, gas: hexToBN(gas), data: res.data });
		}
	};

	/**
	 * Updates readableValue in state
	 *
	 * @param {string} readableValue - String containing the readable value
	 */
	handleUpdateReadableValue = readableValue => {
		this.props.setTransactionObject({ readableValue });
	};

	/**
	 * Updates data in transaction state, after gas is estimated according to this data
	 *
	 * @param {string} data - String containing new data
	 */
	handleUpdateData = async data => {
		const { gas } = await this.estimateGas({ data });
		this.setState({ data });
		this.props.setTransactionObject({ gas: hexToBN(gas), data });
	};

	/**
	 * Updates gas limit
	 *
	 */
	handleGetGasLimit = async () => {
		if (!Object.keys(this.props.transaction.selectedAsset).length) return;
		const { gas } = await this.estimateGas({});
		this.props.setTransactionObject({ gas: hexToBN(gas) });
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
	 * @param {string} ensRecipient? - String containing ens name
	 */
	handleUpdateToAddress = async (to, ensRecipient) => {
		const {
			transaction: { data, assetType }
		} = this.props;
		// If ETH transaction, there is no need to generate new data
		if (assetType === 'ETH') {
			const { gas } = await this.estimateGas({ data, to });
			this.props.setTransactionObject({ to, gas: hexToBN(gas), ensRecipient });
		}
		// If selectedAsset defined, generates data
		else if (to && isValidAddress(to)) {
			const { data, gas } = await this.handleDataGeneration({ to });
			this.props.setTransactionObject({ to, gas: hexToBN(gas), data, ensRecipient });
		} else {
			this.props.setTransactionObject({ to, data: undefined, ensRecipient });
		}
	};

	/**
	 * Updates selectedAsset in transaction state
	 *
	 * @param {object} asset - New asset to send in transaction
	 */
	handleUpdateAsset = async asset => {
		const { transaction } = this.props;
		if (asset.isETH) {
			const { gas } = await this.estimateGas({ to: transaction.to });
			this.props.setTransactionObject({
				value: undefined,
				data: undefined,
				selectedAsset: { symbol: 'ETH', isETH: true },
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
					? generateTransferData('transfer', { toAddress: to, amount: tokenAmountToSend })
					: undefined;
			},
			ERC721: () => {
				const address = selectedAsset.address.toLowerCase();
				const collectibleTransferInformation =
					address in collectiblesTransferInformation && collectiblesTransferInformation[address];
				if (!to) return;
				// If not in list, default to transferFrom
				if (
					!collectibleTransferInformation ||
					(collectibleTransferInformation.tradable &&
						collectibleTransferInformation.method === 'transferFrom')
				) {
					return generateTransferData('transferFrom', {
						fromAddress: from,
						toAddress: to,
						tokenId: toHexadecimal(selectedAsset.tokenId)
					});
				} else if (
					collectibleTransferInformation.tradable &&
					collectibleTransferInformation.method === 'transfer'
				) {
					return generateTransferData('transfer', {
						toAddress: to,
						amount: selectedAsset.tokenId.toString(16)
					});
				}
			}
		};
		const data = generateData[assetType]();
		const { gas } = await this.estimateGas({ data, to: selectedAsset.address });
		return { data, gas };
	};

	validateTotal = totalGas => {
		let error = '';
		const {
			ticker,
			transaction: { value, from, assetType }
		} = this.props;

		const checksummedFrom = safeToChecksumAddress(from) || '';
		const fromAccount = this.props.accounts[checksummedFrom];
		const { balance } = fromAccount;
		const weiBalance = hexToBN(balance);
		const totalGasValue = hexToBN(totalGas);
		let valueBN = hexToBN('0x0');
		if (assetType === 'ETH') {
			valueBN = hexToBN(value);
		}
		const total = valueBN.add(totalGasValue);
		if (!weiBalance.gte(total)) {
			const amount = renderFromWei(total.sub(weiBalance));
			const tokenSymbol = getTicker(ticker);
			this.setState({ over: true });
			error = strings('transaction.insufficient_amount', { amount, tokenSymbol });
		}

		return error;
	};

	/**
	 * Validates amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateAmount = async (allowEmpty = true, totalGas) => {
		const {
			transaction: { assetType }
		} = this.props;
		const validations = {
			ETH: () => this.validateEtherAmount(allowEmpty, totalGas),
			ERC20: async () => await this.validateTokenAmount(allowEmpty, totalGas),
			ERC721: async () => await this.validateCollectibleOwnership()
		};
		if (!validations[assetType]) return false;
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
			const isOwner = toLowerCaseEquals(owner, selectedAddress);
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
	validateEtherAmount = (allowEmpty = true, total) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, from }
			} = this.props;

			if (!value || !from) {
				return strings('transaction.invalid_amount');
			}
			if (value && !isBN(value)) {
				return strings('transaction.invalid_amount');
			}
		}
		return error;
	};

	/**
	 * Validates asset (ERC20) transaction amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateTokenAmount = async (allowEmpty = true, total) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, gas, gasPrice, from, selectedAsset },
				contractBalances
			} = this.props;
			const checksummedFrom = safeToChecksumAddress(from) || '';
			if (!value || !gas || !gasPrice || !from) {
				return strings('transaction.invalid_amount');
			}
			// If user trying to send a token that doesn't own, validate balance querying contract
			// If it fails, skip validation
			let contractBalanceForAddress;
			if (contractBalances[selectedAsset.address]) {
				contractBalanceForAddress = hexToBN(contractBalances[selectedAsset.address].toString(16));
			} else {
				const { AssetsContractController } = Engine.context;
				try {
					contractBalanceForAddress = await AssetsContractController.getBalanceOf(
						selectedAsset.address,
						checksummedFrom
					);
				} catch (e) {
					// Don't validate balance if error
				}
			}
			if (value && !isBN(value)) return strings('transaction.invalid_amount');
			const validateAssetAmount = contractBalanceForAddress && contractBalanceForAddress.lt(value);
			if (validateAssetAmount) return strings('transaction.insufficient');
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
		if (!gas) return strings('transaction.invalid_gas');
		if (gas && !isBN(gas)) return strings('transaction.invalid_gas');
		if (!gasPrice) return strings('transaction.invalid_gas_price');
		if (gasPrice && !isBN(gasPrice)) return strings('transaction.invalid_gas_price');
		if (gas.lt(new BN(21000))) return strings('custom_gas.warning_gas_limit');

		const checksummedFrom = safeToChecksumAddress(from) || '';
		const fromAccount = this.props.accounts[checksummedFrom];
		if (fromAccount && isBN(gas) && isBN(gasPrice) && hexToBN(fromAccount.balance).lt(gas.mul(gasPrice)))
			return strings('transaction.insufficient');
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
			transaction: { to },
			promptedFromApproval
		} = this.props;
		// If it comes from a dapp it could be a contract deployment
		if (promptedFromApproval && !to) return error;
		!to && (error = strings('transaction.required'));
		!to && this.state.toFocused && (error = strings('transaction.required'));
		to && !isValidAddress(to) && (error = strings('transaction.invalid_address'));
		to && to.length !== 42 && (error = strings('transaction.invalid_address'));
		return error;
	};

	/**
	 * Checks if current transaction to is a known contract address
	 * If that's the case returns a warning message
	 *
	 * @returns {string} - Warning message if defined
	 */
	checkForAssetAddress = () => {
		const {
			tokens,
			collectibles,
			transaction: { to },
			networkType
		} = this.props;
		if (!to) {
			return undefined;
		}
		const address = toChecksumAddress(to);
		if (networkType === MAINNET) {
			const contractMapToken = contractMap[address];
			if (contractMapToken) return strings('transaction.known_asset_contract');
		}
		const tokenAddress = tokens.find(token => token.address === address);
		if (tokenAddress) return strings('transaction.known_asset_contract');
		const collectibleAddress = collectibles.find(collectible => collectible.address === address);
		if (collectibleAddress) return strings('transaction.known_asset_contract');
		return undefined;
	};

	review = async () => {
		const { data } = this.state;
		await this.setState({ toFocused: true });
		const validated = !(await this.validate());
		if (validated) {
			if (data && data.substr(0, 2) !== '0x') {
				this.handleUpdateData(addHexPrefix(data));
			}
		}
		this.props?.onModeChange(REVIEW);
	};

	validate = async () => {
		const totalError = this.validateTotal(
			this.state.EIP1559GasData.totalMaxHex || this.state.LegacyGasData.totalHex
		);
		const amountError = await this.validateAmount(false);
		const toAddressError = this.validateToAddress();
		this.setState({ amountError, toAddressError });
		return totalError || amountError || toAddressError;
	};

	updateGas = async (gas, gasLimit, warningGasPriceHigh) => {
		this.handleGasFeeSelection(gas, gasLimit, warningGasPriceHigh);
		const gasError = this.validateGas();
		this.setState({ gasError });
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

	handleFetchBasicEstimates = async () => {
		this.setState({ ready: false });
		const basicGasEstimates = await getBasicGasEstimatesByChainId();
		if (basicGasEstimates) {
			this.handleGasFeeSelection(
				this.props.transaction.gas,
				apiEstimateModifiedToWEI(basicGasEstimates.averageGwei)
			);
		}
		return this.setState({ basicGasEstimates, ready: true });
	};

	getGasAnalyticsParams = () => {
		try {
			const { transaction, activeTabUrl } = this.props;
			const { selectedAsset } = transaction;
			return {
				dapp_host_name: transaction?.origin,
				dapp_url: activeTabUrl,
				active_currency: { value: selectedAsset?.symbol, anonymous: true }
			};
		} catch (error) {
			return {};
		}
	};

	calculateTempGasFee = (gas, selected) => {
		const { transaction } = this.props;
		if (selected && gas) {
			gas.suggestedGasLimit = fromWei(transaction.gas, 'wei');
		}
		this.setState({
			EIP1559GasDataTemp: this.parseTransactionDataEIP1559(gas),
			stopUpdateGas: !selected,
			gasSelectedTemp: selected
		});
	};

	calculateTempGasFeeLegacy = (gas, selected) => {
		const { transaction } = this.props;
		if (selected && gas) {
			gas.suggestedGasLimit = fromWei(transaction.gas, 'wei');
		}
		this.setState({
			LegacyGasDataTemp: this.parseTransactionDataLegacy(gas),
			stopUpdateGas: !selected,
			gasSelectedTemp: selected
		});
	};

	saveGasEdition = gasSelected => {
		const { gasEstimateType } = this.props;
		const { LegacyGasDataTemp } = this.state;

		if (gasEstimateType !== GAS_ESTIMATE_TYPES.FEE_MARKET) {
			this.handleGasFeeSelection(
				hexToBN(LegacyGasDataTemp.suggestedGasLimitHex),
				hexToBN(LegacyGasDataTemp.suggestedGasPriceHex)
			);
		}

		this.setState(
			{
				LegacyGasData: { ...this.state.LegacyGasDataTemp },
				EIP1559GasData: { ...this.state.EIP1559GasDataTemp },
				gasSelected,
				gasSelectedTemp: gasSelected,
				advancedGasInserted: !gasSelected,
				stopUpdateGas: false,
				dappSuggestedGasPrice: null,
				dappSuggestedEIP1559Gas: null
			},
			this.review
		);
	};

	cancelGasEdition = () => {
		this.setState({
			LegacyGasDataTemp: { ...this.state.LegacyGasData },
			EIP1559GasDataTemp: { ...this.state.EIP1559GasData },
			stopUpdateGas: false,
			gasSelectedTemp: this.state.gasSelected
		});
		this.props.onModeChange?.('review');
	};

	renderWarning = () => {
		const { dappSuggestedGasPrice, dappSuggestedEIP1559Gas } = this.state;
		const {
			transaction: { origin }
		} = this.props;
		if (dappSuggestedGasPrice)
			return `This gas fee has been suggested by ${origin}. It’s using legacy gas estimation which may be inaccurate. However, editing this gas fee may cause a problem with your transaction. Please reach out to ${origin} if you have questions.`;
		if (dappSuggestedEIP1559Gas)
			return `This gas fee has been suggested by ${origin}. Overriding this may cause a problem with your transaction. Please reach out to ${origin} if you have questions.`;

		return null;
	};

	onUpdatingValuesStart = () => {
		this.setState({ isAnimating: true });
	};
	onUpdatingValuesEnd = () => {
		this.setState({ isAnimating: false });
	};

	render = () => {
		const {
			mode,
			transactionConfirmed,
			transaction,
			onModeChange,
			gasFeeEstimates,
			primaryCurrency,
			chainId,
			gasEstimateType
		} = this.props;
		const {
			basicGasEstimates,
			ready,
			gasError,
			over,
			EIP1559GasData,
			EIP1559GasDataTemp,
			LegacyGasDataTemp,
			gasSelected,
			dappSuggestedGasPrice,
			dappSuggestedEIP1559Gas,
			animateOnChange,
			isAnimating
		} = this.state;
		return (
			<React.Fragment>
				{mode === 'review' && (
					<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
						<AnimatedTransactionModal onModeChange={onModeChange} ready={ready} review={this.review}>
							<TransactionReview
								onCancel={this.onCancel}
								onConfirm={this.onConfirm}
								validate={this.validate}
								ready={ready}
								transactionConfirmed={transactionConfirmed}
								over={over}
								gasEstimateType={gasEstimateType}
								EIP1559GasData={EIP1559GasData}
								onUpdatingValuesStart={this.onUpdatingValuesStart}
								onUpdatingValuesEnd={this.onUpdatingValuesEnd}
								animateOnChange={animateOnChange}
								isAnimating={isAnimating}
								dappSuggestedGas={Boolean(dappSuggestedGasPrice) || Boolean(dappSuggestedEIP1559Gas)}
							/>

							<CustomGas
								handleGasFeeSelection={this.updateGas}
								basicGasEstimates={basicGasEstimates}
								gas={transaction.gas}
								gasPrice={transaction.gasPrice}
								gasError={gasError}
								mode={mode}
								view={'Transaction'}
								analyticsParams={this.getGasAnalyticsParams()}
							/>
						</AnimatedTransactionModal>
					</KeyboardAwareScrollView>
				)}

				{mode !== 'review' &&
					(gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ? (
						<EditGasFee1559
							selected={gasSelected}
							gasFee={EIP1559GasDataTemp}
							gasOptions={gasFeeEstimates}
							onChange={this.calculateTempGasFee}
							gasFeeNative={EIP1559GasDataTemp.renderableGasFeeMinNative}
							gasFeeConversion={EIP1559GasDataTemp.renderableGasFeeMinConversion}
							gasFeeMaxNative={EIP1559GasDataTemp.renderableGasFeeMaxNative}
							gasFeeMaxConversion={EIP1559GasDataTemp.renderableGasFeeMaxConversion}
							maxPriorityFeeNative={EIP1559GasDataTemp.renderableMaxPriorityFeeNative}
							maxPriorityFeeConversion={EIP1559GasDataTemp.renderableMaxPriorityFeeConversion}
							maxFeePerGasNative={EIP1559GasDataTemp.renderableMaxFeePerGasNative}
							maxFeePerGasConversion={EIP1559GasDataTemp.renderableMaxFeePerGasConversion}
							primaryCurrency={primaryCurrency}
							chainId={chainId}
							timeEstimate={EIP1559GasDataTemp.timeEstimate}
							timeEstimateColor={EIP1559GasDataTemp.timeEstimateColor}
							onCancel={this.cancelGasEdition}
							onSave={this.saveGasEdition}
							dappSuggestedGas={Boolean(dappSuggestedGasPrice) || Boolean(dappSuggestedEIP1559Gas)}
							warning={this.renderWarning()}
							error={EIP1559GasDataTemp.error}
							over={over}
							onUpdatingValuesStart={this.onUpdatingValuesStart}
							onUpdatingValuesEnd={this.onUpdatingValuesEnd}
							animateOnChange={animateOnChange}
							isAnimating={isAnimating}
						/>
					) : (
						<EditGasFeeLegacy
							selected={gasSelected}
							gasFee={LegacyGasDataTemp}
							gasEstimateType={gasEstimateType}
							gasOptions={gasFeeEstimates}
							onChange={this.calculateTempGasFeeLegacy}
							gasFeeNative={LegacyGasDataTemp.transactionFee}
							gasFeeConversion={LegacyGasDataTemp.transactionFeeFiat}
							gasPriceConversion={LegacyGasDataTemp.transactionFeeFiat}
							primaryCurrency={primaryCurrency}
							chainId={chainId}
							onCancel={this.cancelGasEdition}
							onSave={this.saveGasEdition}
							error={LegacyGasDataTemp.error}
							over={over}
							onUpdatingValuesStart={this.onUpdatingValuesStart}
							onUpdatingValuesEnd={this.onUpdatingValuesEnd}
							animateOnChange={animateOnChange}
							isAnimating={isAnimating}
						/>
					))}
			</React.Fragment>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	collectibles: state.engine.backgroundState.AssetsController.collectibles,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: getNormalizedTxState(state),
	activeTabUrl: getActiveTabUrl(state),
	gasFeeEstimates: state.engine.backgroundState.GasFeeController.gasFeeEstimates,
	gasEstimateType: state.engine.backgroundState.GasFeeController.gasEstimateType,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	primaryCurrency: state.settings.primaryCurrency,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransactionEditor);
