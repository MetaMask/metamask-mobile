import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { InteractionManager, SafeAreaView, ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { colors } from '../../../styles/common';
import Engine from '../../../core/Engine';
import EditAmount from '../../Views/SendFlow/Amount';
import ConfirmSend from '../../Views/SendFlow/Confirm';
import { toBN, BNToHex, hexToBN, fromWei, toTokenMinimalUnit } from '../../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import { strings } from '../../../../locales/i18n';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import { connect } from 'react-redux';
import { resetTransaction, setTransactionObject } from '../../../actions/transaction';
import { toggleDappTransactionModal } from '../../../actions/modals';
import NotificationManager from '../../../core/NotificationManager';
import NetworkList, { getNetworkTypeById } from '../../../util/networks';
import contractMap from 'eth-contract-metadata';
import { showAlert } from '../../../actions/alert';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import {
	getTransactionReviewActionKey,
	decodeTransferData,
	getTransactionToName,
	generateTransferData
} from '../../../util/transactions';
import Logger from '../../../util/Logger';
import { isENS } from '../../../util/address';
import TransactionTypes from '../../../core/TransactionTypes';

const REVIEW = 'review';
const EDIT = 'edit';
const SEND = 'Send';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
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
class Send extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('send.confirm', navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Action that cleans transaction state
		 */
		resetTransaction: PropTypes.func.isRequired,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		/* Triggers global alert
		*/
		showAlert: PropTypes.func,
		/**
		 * Map representing the address book
		 */
		addressBook: PropTypes.object,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * Selected address as string
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Object containing token balances in the format address => balance
		 */
		contractBalances: PropTypes.object,
		/**
		/* Hides or shows dApp transaction modal
		*/
		toggleDappTransactionModal: PropTypes.func,
		/**
		/* dApp transaction modal visible or not
		*/
		dappTransactionModalVisible: PropTypes.bool
	};

	state = {
		mode: REVIEW,
		transactionKey: undefined,
		ready: false,
		transactionConfirmed: false,
		transactionSubmitted: false
	};

	mounted = false;
	unmountHandled = false;

	/**
	 * Resets gas and gasPrice of transaction
	 */
	async reset() {
		const { transaction } = this.props;
		const { gas, gasPrice } = await Engine.context.TransactionController.estimateGas(transaction);
		this.props.setTransactionObject({
			gas: hexToBN(gas),
			gasPrice: hexToBN(gasPrice)
		});
		return this.mounted && this.setState({ transactionKey: Date.now() });
	}

	/**
	 * Transaction state is erased, ready to create a new clean transaction
	 */
	clear = () => {
		this.props.resetTransaction();
	};

	/**
	 * Check if view is called with txMeta object for a deeplink
	 */
	checkForDeeplinks() {
		const { navigation } = this.props;
		const txMeta = navigation && navigation.getParam('txMeta', null);
		if (txMeta) {
			this.handleNewTxMeta(txMeta);
		} else {
			this.mounted && this.setState({ ready: true });
		}
	}

	/**
	 * Sets state mounted to true, resets transaction and check for deeplinks
	 */
	async componentDidMount() {
		const {
			navigation,
			transaction: { assetType, selectedAsset },
			contractBalances,
			dappTransactionModalVisible,
			toggleDappTransactionModal
		} = this.props;
		navigation &&
			navigation.setParams({
				mode: REVIEW,
				dispatch: this.onModeChange,
				disableModeChange: assetType === 'ERC20' && contractBalances[selectedAsset.address] === undefined
			});
		dappTransactionModalVisible && toggleDappTransactionModal();
		this.mounted = true;
		await this.reset();
		this.checkForDeeplinks();
	}

	/**
	 * Cancels transaction and sets mounted to false
	 */
	async componentWillUnmount() {
		const { transactionSubmitted } = this.state;
		const { transaction } = this.state;
		if (!transactionSubmitted && !this.unmountHandled) {
			transaction && (await this.onCancel(transaction.id));
		}
		this.clear();
		this.mounted = false;
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const {
			navigation,
			transaction: { assetType, selectedAsset },
			contractBalances
		} = this.props;
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

		const contractBalance = contractBalances[selectedAsset.address];
		const erc20ContractBalanceChanged =
			assetType === 'ERC20' && prevProps.contractBalances[selectedAsset.address] !== contractBalance;
		const assetTypeDefined = prevProps.transaction.assetType === undefined && assetType === 'ERC20';
		if (assetTypeDefined || erc20ContractBalanceChanged) {
			navigation &&
				navigation.setParams({
					disableModeChange: contractBalance === undefined
				});
		}
	}

	/**
	 * Handle deeplink txMeta recipient
	 */
	handleNewTxMetaRecipient = recipient => {
		let ensRecipient, to;
		if (isENS(recipient)) {
			ensRecipient = recipient;
		} else if (recipient && recipient.toLowerCase().substr(0, 2) === '0x') {
			to = toChecksumAddress(recipient);
		}
		return { ensRecipient, to };
	};

	/**
	 * Handle txMeta object, setting neccesary state to make a transaction
	 */
	handleNewTxMeta = async ({
		target_address,
		action,
		chain_id = null,
		function_name = null, // eslint-disable-line no-unused-vars
		parameters = null
	}) => {
		const { addressBook, network, identities, selectedAddress } = this.props;

		if (chain_id) {
			this.handleNetworkSwitch(chain_id);
		}

		let newTxMeta = {};
		switch (action) {
			case 'send-eth':
				newTxMeta = {
					symbol: 'ETH',
					assetType: 'ETH',
					type: 'ETHER_TRANSACTION',
					paymentRequest: true,
					selectedAsset: { symbol: 'ETH', isETH: true },
					...this.handleNewTxMetaRecipient(target_address)
				};
				if (parameters && parameters.value) {
					newTxMeta.value = BNToHex(toBN(parameters.value));
					newTxMeta.transactionValue = newTxMeta.value;
					newTxMeta.readableValue = fromWei(newTxMeta.value);
				}
				newTxMeta.transactionToName = getTransactionToName({
					addressBook,
					network,
					toAddress: newTxMeta.to,
					identities,
					ensRecipient: newTxMeta.ensRecipient
				});
				newTxMeta.transactionTo = newTxMeta.to;
				break;
			case 'send-token': {
				const selectedAsset = await this.handleTokenDeeplink(target_address);
				const { ensRecipient, to } = this.handleNewTxMetaRecipient(parameters.address);
				const tokenAmount = toTokenMinimalUnit(parameters.uint256 || '0', selectedAsset.decimals);
				newTxMeta = {
					assetType: 'ERC20',
					type: 'INDIVIDUAL_TOKEN_TRANSACTION',
					paymentRequest: true,
					selectedAsset,
					ensRecipient,
					to: selectedAsset.address,
					transactionTo: to,
					data: generateTransferData('transfer', {
						toAddress: parameters.address,
						amount: BNToHex(tokenAmount)
					}),
					value: '0x0',
					readableValue: parameters.uint256 || '0'
				};
				newTxMeta.transactionToName = getTransactionToName({
					addressBook,
					network,
					toAddress: to,
					identities,
					ensRecipient
				});
				break;
			}
		}

		if (parameters) {
			const { gas, gasPrice } = parameters;
			if (gas) {
				newTxMeta.gas = toBN(gas);
			}
			if (gasPrice) {
				newTxMeta.gasPrice = toBN(gas);
			}

			// TODO: We should add here support for sending tokens
			// or calling smart contract functions
		}
		if (!newTxMeta.gas || !newTxMeta.gasPrice) {
			const { gas, gasPrice } = await Engine.context.TransactionController.estimateGas(this.props.transaction);
			newTxMeta.gas = toBN(gas);
			newTxMeta.gasPrice = toBN(gasPrice);
		}

		if (!newTxMeta.value) {
			newTxMeta.value = toBN(0);
		}

		newTxMeta.from = selectedAddress;
		newTxMeta.transactionFromName = identities[selectedAddress].name;

		this.props.setTransactionObject(newTxMeta);
		this.mounted && this.setState({ ready: true, transactionKey: Date.now() });
	};

	/**
	 * Method in charge of changing network if is needed
	 *
	 * @param chainId - Corresponding id for network
	 */
	handleNetworkSwitch = chainId => {
		const { networkType } = this.props;
		const newNetworkType = getNetworkTypeById(chainId);
		if (newNetworkType && networkType !== newNetworkType) {
			const { NetworkController, CurrencyRateController } = Engine.context;
			CurrencyRateController.configure({ nativeCurrency: 'ETH' });
			NetworkController.setProviderType(newNetworkType);
			this.props.showAlert({
				isVisible: true,
				autodismiss: 5000,
				content: 'clipboard-alert',
				data: { msg: strings('send.warn_network_change') + NetworkList[newNetworkType].name }
			});
		}
	};

	/**
	 * Retrieves ERC20 asset information (symbol and decimals) to be used with deeplinks
	 *
	 * @param address - Corresponding ERC20 asset address
	 *
	 * @returns ERC20 asset, containing address, symbol and decimals
	 */
	handleTokenDeeplink = async address => {
		const { tokens } = this.props;
		address = toChecksumAddress(address);
		// First check if we have token information in contractMap
		if (address in contractMap) {
			return contractMap[address];
		}
		// Then check if the token is already in state
		const stateToken = tokens.find(token => token.address === address);
		if (stateToken) {
			return stateToken;
		}
		// Finally try to query the contract
		const { AssetsContractController } = Engine.context;
		const token = { address };
		try {
			const decimals = await AssetsContractController.getTokenDecimals(address);
			token.decimals = parseInt(String(decimals));
		} catch (e) {
			// Drop tx since we don't have any form to get decimals and send the correct tx
			this.props.showAlert({
				isVisible: true,
				autodismiss: 2000,
				content: 'clipboard-alert',
				data: { msg: strings(`send.deeplink_failure`) }
			});
			this.onCancel();
		}
		try {
			token.symbol = await AssetsContractController.getAssetSymbol(address);
		} catch (e) {
			token.symbol = 'ERC20';
		}
		return token;
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
		value: BNToHex(transaction.value)
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

	/**
	 * Returns transaction object with gas and gasPrice in hex format
	 *
	 * @param transaction - Transaction object
	 */
	sanitizeTransaction = transaction => ({
		...transaction,
		gas: BNToHex(transaction.gas),
		gasPrice: BNToHex(transaction.gasPrice)
	});

	/**
	 * Removes collectible in case an ERC721 asset is being sent, when not in mainnet
	 */
	removeCollectible = () => {
		const { selectedAsset, assetType, providerType } = this.props.transaction;
		if (assetType === 'ERC721' && providerType !== 'mainnet') {
			const { AssetsController } = Engine.context;
			AssetsController.removeCollectible(selectedAsset.address, selectedAsset.tokenId);
		}
	};

	/**
	 * Cancels transaction and close send screen before clear transaction state
	 *
	 * @param if - Transaction id
	 */
	onCancel = id => {
		Engine.context.TransactionController.cancelTransaction(id);
		this.props.navigation.pop();
		this.unmountHandled = true;
		this.state.mode === REVIEW && this.trackOnCancel();
	};

	/**
	 * Confirms transaction. In case of selectedAsset handles a token transfer transaction,
	 * if not, and Ether transaction.
	 * If success, transaction state is cleared, if not transaction is reset alert about the error
	 * and returns to edit transaction
	 */
	onConfirm = async () => {
		const { TransactionController, AddressBookController } = Engine.context;
		this.setState({ transactionConfirmed: true });
		const {
			transaction: { selectedAsset, assetType },
			network,
			addressBook
		} = this.props;
		let { transaction } = this.props;
		try {
			if (assetType === 'ETH') {
				transaction = this.prepareTransaction(transaction);
			} else {
				transaction = this.prepareAssetTransaction(transaction, selectedAsset);
			}
			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM
			);

			await TransactionController.approveTransaction(transactionMeta.id);

			// Add to the AddressBook if it's an unkonwn address
			let checksummedAddress = null;

			if (assetType === 'ETH') {
				checksummedAddress = toChecksumAddress(transactionMeta.transaction.to);
			} else if (assetType === 'ERC20') {
				try {
					const [addressTo] = decodeTransferData('transfer', transactionMeta.transaction.data);
					if (addressTo) {
						checksummedAddress = toChecksumAddress(addressTo);
					}
				} catch (e) {
					Logger.log('Error decoding transfer data', transactionMeta.data);
				}
			} else if (assetType === 'ERC721') {
				try {
					const data = decodeTransferData('transferFrom', transactionMeta.transaction.data);
					const addressTo = data[1];
					if (addressTo) {
						checksummedAddress = toChecksumAddress(addressTo);
					}
				} catch (e) {
					Logger.log('Error decoding transfer data', transactionMeta.data);
				}
			}
			const existingContact = addressBook[network] && addressBook[network][checksummedAddress];
			if (!existingContact) {
				AddressBookController.set(checksummedAddress, '', network);
			}
			await new Promise(resolve => {
				resolve(result);
			});
			if (transactionMeta.error) {
				throw transactionMeta.error;
			}
			this.setState({ transactionConfirmed: false, transactionSubmitted: true });
			this.props.navigation.pop();
			InteractionManager.runAfterInteractions(() => {
				NotificationManager.watchSubmittedTransaction({
					...transactionMeta,
					assetType: transaction.assetType
				});
				this.removeCollectible();
			});
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [
				{ text: strings('navigation.ok') }
			]);
			this.setState({ transactionConfirmed: false });
			await this.reset();
		}
		InteractionManager.runAfterInteractions(() => {
			this.trackOnConfirm();
		});
	};

	/**
	 * Call Analytics to track confirm started event for send screen
	 */
	trackConfirmScreen = () => {
		Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.TRANSACTIONS_CONFIRM_STARTED, this.getTrackingParams());
	};

	/**
	 * Call Analytics to track confirm started event for send screen
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
			view: SEND,
			network: networkType,
			activeCurrency: (selectedAsset && (selectedAsset.symbol || selectedAsset.contractName)) || 'ETH',
			assetType
		};
	};

	/**
	 * Change transaction mode
	 * If changed to 'review' sends an Analytics track event
	 *
	 * @param mode - Transaction mode, review or edit
	 */
	onModeChange = mode => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode });
		this.mounted && this.setState({ mode });
		InteractionManager.runAfterInteractions(() => {
			mode === REVIEW && this.trackConfirmScreen();
			mode === EDIT && this.trackEditScreen();
		});
	};

	changeToReviewMode = () => this.onModeChange(REVIEW);

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	renderModeComponent() {
		if (this.state.mode === EDIT) {
			return (
				<EditAmount
					transaction={this.props.transaction}
					navigation={this.props.navigation}
					onConfirm={this.changeToReviewMode}
				/>
			);
		} else if (this.state.mode === REVIEW) {
			return <ConfirmSend transaction={this.props.transaction} navigation={this.props.navigation} />;
		}
	}

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			{this.state.ready ? this.renderModeComponent() : this.renderLoader()}
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	transaction: state.transaction,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	network: state.engine.backgroundState.NetworkController.network,
	identities: state.engine.backgroundState.PreferencesController.identities,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	dappTransactionModalVisible: state.modals.dappTransactionModalVisible
});

const mapDispatchToProps = dispatch => ({
	resetTransaction: () => dispatch(resetTransaction()),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showAlert: config => dispatch(showAlert(config)),
	toggleDappTransactionModal: () => dispatch(toggleDappTransactionModal())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Send);
