import React, { PureComponent } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import ConfirmSend from '../../Views/SendFlow/Confirm';
import TransactionReview from '../TransactionReview';
import CustomGas from '../CustomGas';
import { isBN, hexToBN, toBN, isDecimal, fromWei } from '../../../util/number';
import { isValidAddress, toChecksumAddress, BN, addHexPrefix } from 'ethereumjs-util';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { generateTransferData, getNormalizedTxState } from '../../../util/transactions';
import { getBasicGasEstimates, apiEstimateModifiedToWEI } from '../../../util/custom-gas';
import { setTransactionObject } from '../../../actions/transaction';
import Engine from '../../../core/Engine';
import collectiblesTransferInformation from '../../../util/collectibles-transfer';
import contractMap from 'eth-contract-metadata';
import PaymentChannelsClient from '../../../core/PaymentChannelsClient';
import { safeToChecksumAddress } from '../../../util/address';
import TransactionTypes from '../../../core/TransactionTypes';
import Device from '../../../util/Device';

const EDIT = 'edit';
const REVIEW = 'review';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		minHeight: 200,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: Device.isIphoneX() ? 24 : 0
	},
	transactionEdit: {
		position: 'absolute',
		width: '100%',
		height: '100%'
	},
	transactionReview: {
		paddingTop: 24
	},
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
		 * Callback triggered when this transaction is cancelled
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
		promptedFromApproval: PropTypes.bool
	};

	state = {
		toFocused: false,
		ensRecipient: undefined,
		basicGasEstimates: {},
		ready: false,
		data: undefined,
		advancedCustomGas: false,
		amountError: '',
		gasError: '',
		toAddressError: '',
		modalValue: new Animated.Value(1),
		reviewToEditValue: new Animated.Value(0),
		reviewToDataValue: new Animated.Value(0),
		editToAdvancedValue: new Animated.Value(0),
		width: Device.getDeviceWidth(),
		rootHeight: null,
		customGasHeight: null,
		transactionReviewDataHeight: null,
		hideGasSelectors: false,
		hideData: true,
		toAdvancedFrom: 'edit'
	};

	xTranslationMappings = {
		reviewToEdit: this.state.reviewToEditValue,
		editToAdvanced: this.state.editToAdvancedValue,
		reviewToData: this.state.reviewToDataValue
	};

	componentDidMount = async () => {
		const { transaction } = this.props;
		await this.handleFetchBasicEstimates();
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

	componentDidUpdate = prevProps => {
		const { transaction } = this.props;
		if (transaction.data !== prevProps.transaction.data) {
			this.handleUpdateData(transaction.data);
		}
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
	 */
	handleGasFeeSelection = (gasLimit, gasPrice) => {
		this.props.setTransactionObject({ gas: gasLimit, gasPrice });
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
						tokenId: selectedAsset.tokenId
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

	/**
	 * Validates amount, gas and to address
	 *
	 * @returns {string} - Whether the transaction is valid or not, if not it returns error message
	 */
	validate = async () => this.validateGas() || this.validateToAddress() || (await this.validateAmount(false));

	/**
	 * Validates amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateAmount = async (allowEmpty = true) => {
		const {
			transaction: { assetType, paymentChannelTransaction }
		} = this.props;
		if (paymentChannelTransaction) {
			return this.validatePaymentChannelAmount(allowEmpty);
		}
		const validations = {
			ETH: () => this.validateEtherAmount(allowEmpty),
			ERC20: async () => await this.validateTokenAmount(allowEmpty),
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
			const checksummedFrom = safeToChecksumAddress(from) || '';
			const fromAccount = this.props.accounts[checksummedFrom];
			if (!value || !gas || !gasPrice || !from) return strings('transaction.invalid_amount');
			if (value && !isBN(value)) return strings('transaction.invalid_amount');
			if (
				value &&
				fromAccount &&
				isBN(gas) &&
				isBN(gasPrice) &&
				isBN(value) &&
				hexToBN(fromAccount.balance).lt(value.add(gas.mul(gasPrice)))
			)
				return strings('transaction.insufficient');
		}
		return error;
	};

	/**
	 * Validates asset (ERC20) transaction amount
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validateTokenAmount = async (allowEmpty = true) => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, gas, gasPrice, from, selectedAsset },
				contractBalances
			} = this.props;
			const checksummedFrom = safeToChecksumAddress(from) || '';
			const fromAccount = this.props.accounts[checksummedFrom];
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
			const ethTotalAmount = gas.mul(gasPrice);
			if (
				value &&
				fromAccount &&
				isBN(gas) &&
				isBN(gasPrice) &&
				(validateAssetAmount || hexToBN(fromAccount.balance).lt(ethTotalAmount))
			)
				return strings('transaction.insufficient');
		}
		return error;
	};

	/**
	 * Validates payment request transaction
	 *
	 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
	 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
	 */
	validatePaymentChannelAmount = allowEmpty => {
		let error;
		if (!allowEmpty) {
			const {
				transaction: { value, readableValue, from }
			} = this.props;
			if (!value || !from || !readableValue) {
				return strings('transaction.invalid_amount');
			}
			if (value && !isBN(value)) return strings('transaction.invalid_amount');
			const state = PaymentChannelsClient.getState();
			if (isDecimal(state.balance) && parseFloat(readableValue) > parseFloat(state.balance)) {
				return strings('transaction.insufficient');
			}
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
			transaction: { gas, gasPrice, from, paymentChannelTransaction }
		} = this.props;
		// If its handling a payment request transaction it won't do any gas validation
		if (paymentChannelTransaction) return;
		if (!gas) return strings('transaction.invalid_gas');
		if (gas && !isBN(gas)) return strings('transaction.invalid_gas');
		if (!gasPrice) return strings('transaction.invalid_gas_price');
		if (gasPrice && !isBN(gasPrice)) return strings('transaction.invalid_gas_price');
		if (gas.lt(new BN(21000)) || gas.gt(new BN(7920028))) return strings('custom_gas.warning_gas_limit');

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
		if (networkType === 'mainnet') {
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
		this.onModeChange('review');
	};

	validate = async () => {
		const amountError = await this.validateAmount(false);
		const gasError = this.validateGas();
		const toAddressError = this.validateToAddress();
		this.setState({ amountError, gasError, toAddressError });
		return amountError || gasError || toAddressError;
	};

	updateGas = async (gas, gasLimit) => {
		await this.handleGasFeeSelection(gas, gasLimit);
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
		const basicGasEstimates = await getBasicGasEstimates();
		this.handleGasFeeSelection(this.props.transaction.gas, apiEstimateModifiedToWEI(basicGasEstimates.averageGwei));
		this.setState({ basicGasEstimates, ready: true });
	};

	onModeChange = mode => {
		if (mode === 'edit') {
			this.setState({ toAdvancedFrom: 'review' });
			this.animate({
				modalEndValue: this.state.advancedCustomGas ? this.getAnimatedModalValueForAdvancedCG() : 0,
				xTranslationName: 'reviewToEdit',
				xTranslationEndValue: 1
			});
		} else {
			this.animate({
				modalEndValue: 1,
				xTranslationName: 'reviewToEdit',
				xTranslationEndValue: 0
			});
		}
		this.props.onModeChange(mode);
	};

	toggleAdvancedCustomGas = (toggle = false) => {
		const { advancedCustomGas } = this.state;
		this.setState({ advancedCustomGas: toggle ? true : !advancedCustomGas, toAdvancedFrom: 'edit' });
	};

	hideComponents = (xTranslationName, xTranslationEndValue, animationTime) => {
		//data view is hidden by default because when we switch from review to edit, since view is nested in review, it also gets transformed. It's shown if it's the animation's destination.
		if (xTranslationName === 'editToAdvanced') {
			this.setState({
				hideGasSelectors: xTranslationEndValue === 1 && animationTime === 'end'
			});
		}
		if (xTranslationName === 'reviewToData') {
			this.setState({
				hideData: xTranslationEndValue === 0 && animationTime === 'end'
			});
		}
	};

	animate = ({ modalEndValue, xTranslationName, xTranslationEndValue }) => {
		const { modalValue } = this.state;
		this.hideComponents(xTranslationName, xTranslationEndValue, 'start');
		Animated.parallel([
			Animated.timing(modalValue, {
				toValue: modalEndValue,
				duration: 250,
				easing: Easing.ease,
				useNativeDriver: true
			}),
			Animated.timing(this.xTranslationMappings[xTranslationName], {
				toValue: xTranslationEndValue,
				duration: 250,
				easing: Easing.ease,
				useNativeDriver: true
			})
		]).start(() => {
			this.hideComponents(xTranslationName, xTranslationEndValue, 'end');
		});
	};

	generateTransform = (valueType, outRange) => {
		const { modalValue, reviewToEditValue, editToAdvancedValue, reviewToDataValue } = this.state;
		if (valueType === 'modal' || valueType === 'saveButton') {
			return {
				transform: [
					{
						translateY: modalValue.interpolate({
							inputRange: [0, valueType === 'saveButton' ? this.getAnimatedModalValueForAdvancedCG() : 1],
							outputRange: outRange
						})
					}
				]
			};
		}
		let value;
		if (valueType === 'reviewToEdit') value = reviewToEditValue;
		else if (valueType === 'editToAdvanced') value = editToAdvancedValue;
		else if (valueType === 'reviewToData') value = reviewToDataValue;
		return {
			transform: [
				{
					translateX: value.interpolate({
						inputRange: [0, 1],
						outputRange: outRange
					})
				}
			]
		};
	};

	getAnimatedModalValueForAdvancedCG = () => {
		const { rootHeight, customGasHeight } = this.state;
		//70 is the fixed height + margin of the error message in advanced custom gas. It expands 70 units vertically to accomodate it
		return 70 / (rootHeight - customGasHeight);
	};

	saveRootHeight = event => this.setState({ rootHeight: event.nativeEvent.layout.height });

	saveCustomGasHeight = event =>
		!this.state.customGasHeight && this.setState({ customGasHeight: event.nativeEvent.layout.height });

	saveTransactionReviewDataHeight = event =>
		!this.state.transactionReviewDataHeight &&
		this.setState({ transactionReviewDataHeight: event.nativeEvent.layout.height });

	getTransformValue = () => {
		const { rootHeight, customGasHeight } = this.state;
		return rootHeight - customGasHeight;
	};
	render = () => {
		const { mode, transactionConfirmed, transaction } = this.props;
		const {
			basicGasEstimates,
			ready,
			width,
			advancedCustomGas,
			hideGasSelectors,
			gasError,
			toAdvancedFrom,
			hideData,
			customGasHeight
		} = this.state;
		const paymentChannelTransaction = transaction ? transaction.paymentChannelTransaction : false;
		return (
			<React.Fragment>
				{mode === EDIT && paymentChannelTransaction && <ConfirmSend transaction={transaction} />}
				{!paymentChannelTransaction && (
					<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
						<Animated.View
							style={[styles.root, this.generateTransform('modal', [this.getTransformValue(), 0])]}
							onLayout={this.saveRootHeight}
						>
							<Animated.View
								style={[this.generateTransform('reviewToEdit', [0, -width]), styles.transactionReview]}
							>
								<TransactionReview
									onCancel={this.onCancel}
									onConfirm={this.onConfirm}
									onModeChange={this.onModeChange}
									validate={this.validate}
									ready={ready}
									transactionConfirmed={transactionConfirmed}
									generateTransform={this.generateTransform}
									animate={this.animate}
									hideData={hideData}
									saveTransactionReviewDataHeight={this.saveTransactionReviewDataHeight}
									customGasHeight={customGasHeight}
								/>
							</Animated.View>
							{ready && (
								<Animated.View
									style={[styles.transactionEdit, this.generateTransform('reviewToEdit', [width, 0])]}
								>
									<CustomGas
										handleGasFeeSelection={this.updateGas}
										basicGasEstimates={basicGasEstimates}
										gas={transaction.gas}
										gasPrice={transaction.gasPrice}
										gasError={gasError}
										toggleAdvancedCustomGas={this.toggleAdvancedCustomGas}
										advancedCustomGas={advancedCustomGas}
										review={this.review}
										saveCustomGasHeight={this.saveCustomGasHeight}
										animate={this.animate}
										generateTransform={this.generateTransform}
										getAnimatedModalValueForAdvancedCG={this.getAnimatedModalValueForAdvancedCG}
										hideGasSelectors={hideGasSelectors}
										mode={mode}
										toAdvancedFrom={toAdvancedFrom}
									/>
								</Animated.View>
							)}
						</Animated.View>
					</KeyboardAwareScrollView>
				)}
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
	transaction: getNormalizedTxState(state)
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransactionEditor);
