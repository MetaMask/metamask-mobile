import {
	AccountTrackerController,
	AddressBookController,
	AssetsContractController,
	AssetsController,
	AssetsDetectionController,
	ComposableController,
	CurrencyRateController,
	KeyringController,
	PersonalMessageManager,
	MessageManager,
	NetworkController,
	NetworkStatusController,
	PhishingController,
	PreferencesController,
	ShapeShiftController,
	TokenBalancesController,
	TokenRatesController,
	TransactionController,
	TypedMessageManager
} from 'gaba';

import AsyncStorage from '@react-native-community/async-storage';

import Encryptor from './Encryptor';
import { toChecksumAddress } from 'ethereumjs-util';
import Networks from '../util/networks';
import AppConstants from './AppConstants';
import { store } from '../store';
import { renderFromTokenMinimalUnit, balanceToFiatNumber, weiToFiatNumber } from '../util/number';
import TransactionsNotificationManager from './TransactionsNotificationManager';
import contractMap from 'eth-contract-metadata';

const OPENSEA_API_KEY = process.env['MM_OPENSEA_KEY']; // eslint-disable-line dot-notation
const encryptor = new Encryptor();
let refreshing = false;
/**
 * Core controller responsible for composing other GABA controllers together
 * and exposing convenience methods for common wallet operations.
 */
class Engine {
	/**
	 * ComposableController reference containing all child controllers
	 */
	datamodel;

	/**
	 * Object containing the info for the latest incoming tx block
	 * for each address and network
	 */
	lastIncomingTxBlockInfo;

	/**
	 * Creates a CoreController instance
	 */
	constructor(initialState = {}) {
		if (!Engine.instance) {
			const { nativeCurrency, currentCurrency } = initialState.CurrencyRateController || {
				nativeCurrency: 'eth',
				currentCurrency: 'usd'
			};
			this.datamodel = new ComposableController(
				[
					new KeyringController({ encryptor }, initialState.KeyringController),
					new AccountTrackerController(),
					new AddressBookController(),
					new AssetsContractController(),
					new AssetsController(),
					new AssetsDetectionController(),
					new CurrencyRateController({
						nativeCurrency,
						currentCurrency
					}),
					new PersonalMessageManager(),
					new MessageManager(),
					new NetworkController(
						{
							providerConfig: {
								static: {
									eth_sendTransaction: async (payload, next, end) => {
										const { TransactionController } = this.datamodel.context;
										try {
											const hash = await (await TransactionController.addTransaction(
												payload.params[0]
											)).result;
											end(undefined, hash);
										} catch (error) {
											end(error);
										}
									}
								},
								getAccounts: (end, payload) => {
									const { approvedHosts, privacyMode } = store.getState();
									const isEnabled = !privacyMode || approvedHosts[payload.hostname];
									const { KeyringController } = this.datamodel.context;
									const isUnlocked = KeyringController.isUnlocked();
									const selectedAddress = this.datamodel.context.PreferencesController.state
										.selectedAddress;
									end(null, isUnlocked && isEnabled && selectedAddress ? [selectedAddress] : []);
								}
							}
						},
						{ network: '1', provider: { type: 'mainnet' } }
					),
					new NetworkStatusController(),
					new PhishingController(),
					new PreferencesController(
						{},
						{
							ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL
						}
					),
					new ShapeShiftController(),
					new TokenBalancesController(),
					new TokenRatesController(),
					new TransactionController(),
					new TypedMessageManager()
				],
				initialState
			);

			const {
				AssetsController: assets,
				KeyringController: keyring,
				NetworkController: network,
				TransactionController: transaction
			} = this.datamodel.context;

			assets.setApiKey(OPENSEA_API_KEY);
			network.refreshNetwork();
			transaction.configure({ sign: keyring.signTransaction.bind(keyring) });
			network.subscribe(this.refreshNetwork);
			this.configureControllersOnNetworkChange();
			Engine.instance = this;
		}
		return Engine.instance;
	}

	configureControllersOnNetworkChange() {
		const {
			AccountTrackerController,
			AssetsContractController,
			AssetsDetectionController,
			NetworkController: { provider },
			TransactionController
		} = this.datamodel.context;

		provider.sendAsync = provider.sendAsync.bind(provider);
		AccountTrackerController.configure({ provider });
		AccountTrackerController.refresh();
		AssetsContractController.configure({ provider });
		TransactionController.configure({ provider });
		TransactionController.hub.emit('networkChange');
		AssetsDetectionController.detectAssets();
	}

	/**
	 * Refreshes all controllers that depend on the network
	 */
	refreshNetwork = () => {
		if (!refreshing) {
			refreshing = true;
			setTimeout(() => {
				this.configureControllersOnNetworkChange();
				refreshing = false;
			}, 500);
		}
	};

	refreshTransactionHistory = async forceCheck => {
		const { TransactionController, PreferencesController, NetworkController } = this.datamodel.context;
		const { selectedAddress } = PreferencesController.state;
		const { type: networkType } = NetworkController.state.provider;
		const { networkId } = Networks[networkType];
		try {
			const lastIncomingTxBlockInfoStr = await AsyncStorage.getItem('@MetaMask:lastIncomingTxBlockInfo');
			const allLastIncomingTxBlocks =
				(lastIncomingTxBlockInfoStr && JSON.parse(lastIncomingTxBlockInfoStr)) || {};
			let blockNumber = null;
			if (
				allLastIncomingTxBlocks[`${selectedAddress}`] &&
				allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`]
			) {
				blockNumber = allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`].blockNumber;
				// Let's make sure we're not doing this too often...
				const timeSinceLastCheck = allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`].lastCheck;
				const delta = Date.now() - timeSinceLastCheck;
				if (delta < AppConstants.TX_CHECK_MAX_FREQUENCY && !forceCheck) {
					return false;
				}
			} else {
				allLastIncomingTxBlocks[`${selectedAddress}`] = {};
			}
			//Fetch txs and get the new lastIncomingTxBlock number
			const newlastIncomingTxBlock = await TransactionController.fetchAll(selectedAddress, blockNumber);
			// Check if it's a newer block and store it so next time we ask for the newer txs only
			if (
				allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`] &&
				allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`].blockNumber !== newlastIncomingTxBlock &&
				newlastIncomingTxBlock &&
				newlastIncomingTxBlock !== blockNumber
			) {
				allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`] = {
					blockNumber: newlastIncomingTxBlock,
					lastCheck: Date.now()
				};

				TransactionsNotificationManager.gotIncomingTransaction(newlastIncomingTxBlock);
			} else {
				allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`] = {
					...allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`],
					lastCheck: Date.now()
				};
			}
			await AsyncStorage.setItem('@MetaMask:lastIncomingTxBlockInfo', JSON.stringify(allLastIncomingTxBlocks));
		} catch (e) {
			console.log('Error while fetching all txs', e); // eslint-disable-line
		}
	};

	getTotalFiatAccountBalance = () => {
		const {
			CurrencyRateController,
			PreferencesController,
			AccountTrackerController,
			AssetsController,
			TokenBalancesController,
			TokenRatesController
		} = this.datamodel.context;
		const { selectedAddress } = PreferencesController.state;
		const { conversionRate } = CurrencyRateController.state;
		const { accounts } = AccountTrackerController.state;
		const { tokens } = AssetsController.state;
		let ethFiat = 0;
		let tokenFiat = 0;
		if (accounts[selectedAddress]) {
			ethFiat = weiToFiatNumber(accounts[selectedAddress].balance, conversionRate);
		}
		if (tokens.length > 0) {
			const { contractBalances: tokenBalances } = TokenBalancesController.state;
			const { contractExchangeRates: tokenExchangeRates } = TokenRatesController.state;
			tokens.forEach(item => {
				const exchangeRate = item.address in tokenExchangeRates ? tokenExchangeRates[item.address] : undefined;
				const tokenBalance =
					item.balance ||
					(item.address in tokenBalances
						? renderFromTokenMinimalUnit(tokenBalances[item.address], item.decimals)
						: undefined);
				const tokenBalanceFiat = balanceToFiatNumber(tokenBalance, conversionRate, exchangeRate);
				tokenFiat += tokenBalanceFiat;
			});
		}

		const total = ethFiat + tokenFiat;
		return total;
	};

	sync = async ({ accounts, preferences, network, transactions, seed, pass }) => {
		const {
			KeyringController,
			PreferencesController,
			NetworkController,
			TransactionController,
			AssetsController
		} = this.datamodel.context;

		// Select same network ?
		await NetworkController.setProviderType(network.provider.type);

		// Recreate accounts
		await KeyringController.createNewVaultAndRestore(pass, seed);
		for (let i = 0; i < accounts.hd.length - 1; i++) {
			await KeyringController.addNewAccount();
		}

		// Sync tokens
		const allTokens = {};
		Object.keys(preferences.accountTokens).forEach(address => {
			const checksummedAddress = toChecksumAddress(address);
			allTokens[checksummedAddress] = {};
			Object.keys(preferences.accountTokens[address]).forEach(
				networkType =>
					(allTokens[checksummedAddress][networkType] =
						networkType !== 'mainnet'
							? preferences.accountTokens[address][networkType]
							: preferences.accountTokens[address][networkType]
									.filter(({ address }) =>
										contractMap[toChecksumAddress(address)]
											? contractMap[toChecksumAddress(address)].erc20
											: true
									)
									.map(token => ({ ...token, address: toChecksumAddress(token.address) })))
			);
		});
		await AssetsController.update({ allTokens });

		// Restore preferences
		const updatedPref = { ...preferences, identities: {} };
		Object.keys(preferences.identities).forEach(address => {
			const checksummedAddress = toChecksumAddress(address);
			if (accounts.hd.includes(checksummedAddress)) {
				updatedPref.identities[checksummedAddress] = preferences.identities[address];
			}
		});
		await PreferencesController.update(updatedPref);
		if (accounts.hd.includes(toChecksumAddress(updatedPref.selectedAddress))) {
			await PreferencesController.update({ selectedAddress: toChecksumAddress(updatedPref.selectedAddress) });
		} else {
			await PreferencesController.update({ selectedAddress: toChecksumAddress(accounts.hd[0]) });
		}

		await TransactionController.update({
			transactions: transactions.map(tx => ({
				id: tx.id,
				networkID: tx.metamaskNetworkId,
				origin: tx.origin,
				status: tx.status,
				time: tx.time,
				transactionHash: tx.hash,
				rawTx: tx.rawTx,
				transaction: {
					from: tx.txParams.from,
					to: tx.txParams.to,
					nonce: tx.txParams.nonce,
					gas: tx.txParams.gas,
					gasPrice: tx.txParams.gasPrice,
					value: tx.txParams.value
				}
			}))
		});

		return true;
	};
}

let instance;

export default {
	get context() {
		return instance && instance.datamodel && instance.datamodel.context;
	},
	get state() {
		const {
			AccountTrackerController,
			AddressBookController,
			AssetsContractController,
			AssetsController,
			AssetsDetectionController,
			CurrencyRateController,
			KeyringController,
			PersonalMessageManager,
			NetworkController,
			NetworkStatusController,
			PreferencesController,
			PhishingController,
			TokenBalancesController,
			TokenRatesController,
			TransactionController,
			TypedMessageManager
		} = instance.datamodel.state;

		return {
			AccountTrackerController,
			AddressBookController,
			AssetsContractController,
			AssetsController,
			AssetsDetectionController,
			CurrencyRateController,
			KeyringController,
			PersonalMessageManager,
			NetworkController,
			NetworkStatusController,
			PhishingController,
			PreferencesController,
			TokenBalancesController,
			TokenRatesController,
			TransactionController,
			TypedMessageManager
		};
	},
	get datamodel() {
		return instance.datamodel;
	},
	getTotalFiatAccountBalance() {
		return instance.getTotalFiatAccountBalance();
	},
	sync(data) {
		return instance.sync(data);
	},
	refreshTransactionHistory(forceCheck = false) {
		return instance.refreshTransactionHistory(forceCheck);
	},
	init(state) {
		instance = new Engine(state);
		Object.freeze(instance);
		return instance;
	}
};
