import Engine from './Engine';
import Logger from '../util/Logger';
import AsyncStorage from '@react-native-community/async-storage';
// eslint-disable-next-line
import * as Connext from 'connext';
import EthQuery from 'ethjs-query';

import NotificationManager from './NotificationManager';
import { hideMessage } from 'react-native-flash-message';
import { toWei, toBN, renderFromWei, BNToHex } from '../util/number';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import AppConstants from './AppConstants';
import byteArrayToHex from '../util/bytes';
import Networks from '../util/networks';
import { LAST_KNOWN_INSTANT_PAYMENT_ID } from '../constants/storage';

const {
	CONNEXT: { CONTRACTS }
} = AppConstants;

// eslint-disable-next-line
const createInfuraProvider = require('eth-json-rpc-infura/src/createProvider');
const PUBLIC_URL = 'hub.connext.network';

const { hasPendingOps } = new Connext.Utils();
// Constants for channel max/min - this is also enforced on the hub
const WEI_PER_ETHER = toBN('1000000000000000000');
const {
	HUB_EXCHANGE_CEILING_TOKEN,
	MIN_DEPOSIT_ETH,
	MAX_DEPOSIT_TOKEN,
	BLOCKED_DEPOSIT_DURATION_MINUTES,
	SUPPORTED_NETWORKS
} = AppConstants.CONNEXT;

const HUB_EXCHANGE_CEILING = WEI_PER_ETHER.mul(toBN(HUB_EXCHANGE_CEILING_TOKEN));
const hub = new EventEmitter();

/**
 * Class that wraps the connext client for
 * payment channels
 */
class PaymentChannelsClient {
	constructor(address) {
		const { provider } = Engine.context.NetworkController.state;
		this.selectedAddress = address;
		this.state = {
			ready: false,
			provider,
			hubUrl: null,
			tokenAddress: null,
			contractAddress: null,
			hubWalletAddress: null,
			ethprovider: null,
			tokenContract: null,
			connext: null,
			channelManagerAddress: null,
			ethChainId: null,
			authorized: false,
			address: null,
			channelState: null,
			connextState: null,
			persistent: null,
			runtime: null,
			exchangeRate: 0,
			sendAmount: '',
			sendRecipient: '',
			depositAmount: '',
			status: {
				txHash: '',
				type: '',
				reset: false
			},
			depositPending: false,
			withdrawalPending: false,
			withdrawalPendingValue: undefined,
			blocked: false,
			transactions: [],
			swapPending: false
		};
	}

	setState = data => {
		Object.keys(data).forEach(key => {
			this.state[key] = data[key];
		});
	};

	async setConnext(provider) {
		const { type } = provider;
		const infuraProvider = createInfuraProvider({ network: type });

		let hubUrl;
		const ethprovider = new EthQuery(infuraProvider);
		switch (type) {
			case 'rinkeby':
				hubUrl = `https://rinkeby.${PUBLIC_URL}/api/hub`;
				break;
			case 'mainnet':
				hubUrl = `https://${PUBLIC_URL}/api/hub`;
				break;
			default:
				throw new Error(`Unrecognized network: ${type}`);
		}

		const { KeyringController, TransactionController } = Engine.context;
		const opts = {
			hubUrl,
			externalWallet: {
				external: true,
				address: this.selectedAddress,
				getAddress: () => Promise.resolve(this.selectedAddress),
				signMessage: message => {
					const hexMessage = byteArrayToHex(message);
					return KeyringController.signPersonalMessage({ data: hexMessage, from: this.selectedAddress });
				},
				sign: async txMeta => {
					// We have to normalize the values
					delete txMeta.gas;
					delete txMeta.gasPrice;
					const weiValue = txMeta.value.toString();
					const bnValue = toBN(weiValue);

					const normalizedTxMeta = {
						...txMeta,
						value: BNToHex(bnValue),
						silent: true
					};

					try {
						const signedTx = await TransactionController.addTransaction(normalizedTxMeta);
						const hash = await signedTx.result;

						return new Promise(resolve => {
							TransactionController.hub.on(`${signedTx.transactionMeta.id}:finished`, async () => {
								TransactionController.hub.removeAllListeners(`${signedTx.transactionMeta.id}:finished`);
							});

							TransactionController.hub.on(`${signedTx.transactionMeta.id}:confirmed`, async () => {
								TransactionController.hub.removeAllListeners(
									`${signedTx.transactionMeta.id}:confirmed`
								);
								setTimeout(() => {
									NotificationManager.showInstantPaymentNotification('pending_deposit');
								}, 1000);
								resolve({
									hash,
									wait: () => Promise.resolve(1)
								});
							});
						});
					} catch (e) {
						if (!this.state.blocked) {
							this.setState({ blocked: true });
							setTimeout(() => {
								this.setState({ blocked: false });
							}, 60 * BLOCKED_DEPOSIT_DURATION_MINUTES * 1000);
						}
						Logger.error(e, 'ExternalWallet::sign');
						throw e;
					}
				}
			},
			web3Provider: Engine.context.NetworkController.provider
		};

		// *** Instantiate the connext client ***
		try {
			Logger.log('PC::createClient about to call');
			const connext = await Connext.createClient(opts);
			Logger.log('PC::createClient success');
			this.setState({
				connext,
				tokenAddress: connext.opts.tokenAddress,
				channelManagerAddress: connext.opts.contractAddress,
				hubWalletAddress: connext.opts.hubAddress,
				ethChainId: connext.opts.ethChainId,
				ethprovider
			});
		} catch (e) {
			this.logCurrentState('PC::createClient');
			Logger.error(e, 'PC::createClient');
			throw e;
		}
	}

	getBalance = () => {
		const amount = (this.state && this.state.channelState && this.state.channelState.balanceTokenUser) || '0';
		const ret = parseFloat(renderFromWei(amount, 18));
		if (ret === 0) {
			return '0.00';
		}
		return ret.toFixed(2).toString();
	};

	async startConnext() {
		const { connext } = this.state;
		try {
			await connext.start();
		} catch (e) {
			this.logCurrentState('PC::start');
			Logger.error(e, 'PC::start');
		}
	}

	async pollConnextState() {
		Logger.log('PC::createClient success');
		const { connext } = this.state;
		// start polling
		try {
			Logger.log('PC::pollConnextState connext.start');
			await connext.start();
			Logger.log('PC::pollConnextState connext.start succesful');
		} catch (e) {
			this.logCurrentState('PC::start');
			Logger.error(e, 'PC::start');
		}
		// register connext listeners
		connext.on('onStateChange', async state => {
			try {
				this.checkForBalanceChange(state);
				this.setState({
					ready: true,
					channelState: state.persistent.channel,
					connextState: state,
					runtime: state.runtime,
					exchangeRate: state.runtime.exchangeRate ? state.runtime.exchangeRate.rates.DAI : 0
				});
				this.checkStatus();
				const transactions = await this.state.connext.getPaymentHistory();
				hub.emit('state::change', {
					balance: this.getBalance(),
					status: this.state.status,
					transactions,
					ready: true
				});
				if (state.runtime.channelStatus === 'CS_CHAINSAW_ERROR') {
					hub.emit('state::cs_chainsaw_error', { channelState: state.persistent.channel });
				}
			} catch (e) {
				this.logCurrentState('PC::onStateChange');
				Logger.error(e, 'PC::onStateChange');
			}
		});
	}

	checkPaymentHistory = async () => {
		const paymentHistory = await this.state.connext.getPaymentHistory();
		const lastKnownPaymentIDStr = await AsyncStorage.getItem(LAST_KNOWN_INSTANT_PAYMENT_ID);
		let lastKnownPaymentID = 0;
		const latestPayment = paymentHistory.find(
			payment => payment.recipient.toLowerCase() === this.selectedAddress.toLowerCase()
		);
		if (latestPayment) {
			const latestPaymentID = parseInt(latestPayment.id, 10);
			if (lastKnownPaymentIDStr) {
				lastKnownPaymentID = parseInt(lastKnownPaymentIDStr, 10);
				if (lastKnownPaymentID < latestPaymentID) {
					const amountToken = renderFromWei(latestPayment.amount.amountToken);
					setTimeout(() => {
						NotificationManager.showIncomingPaymentNotification(amountToken);
					}, 300);
					await AsyncStorage.setItem(LAST_KNOWN_INSTANT_PAYMENT_ID, latestPaymentID.toString());
				}
			} else {
				// For first time flow
				await AsyncStorage.setItem(LAST_KNOWN_INSTANT_PAYMENT_ID, latestPaymentID.toString());
			}
		}
		this.setState({ transactions: paymentHistory });
	};

	pollAndSwap = async () => {
		try {
			await this.autoSwap();
		} catch (e) {
			this.logCurrentState('PC::autoswap');
			Logger.error(e, 'PC::autoswap');
			this.setState({ swapPending: false });
		}
		this.autoswapHandler = setTimeout(() => {
			this.pollAndSwap();
		}, 1000);
	};

	async autoSwap() {
		const { channelState, connextState, swapPending } = this.state;
		if (!connextState || hasPendingOps(channelState) || swapPending) {
			!swapPending && this.logCurrentState('PC::autoswap::exception');
			return;
		}
		const weiBalance = toBN(channelState.balanceWeiUser);
		const tokenBalance = toBN(channelState.balanceTokenUser);
		if (channelState && weiBalance.gt(toBN('0')) && tokenBalance.lte(HUB_EXCHANGE_CEILING)) {
			this.setState({ swapPending: true });
			Logger.log('PC::pollAndSwap autoSwap exchanging');
			await this.state.connext.exchange(channelState.balanceWeiUser, 'wei');
			Logger.log('PC::pollAndSwap autoSwap exchanging succesful');
			this.setState({ swapPending: false });
		}
	}

	checkForBalanceChange = async newState => {
		// Check for balance changes
		const prevBalance = (this.state && this.state.channelState && this.state.channelState.balanceTokenUser) || '0';
		const currentBalance =
			(newState && newState.persistent.channel && newState.persistent.channel.balanceTokenUser) || '0';
		if (toBN(prevBalance).lt(toBN(currentBalance))) {
			this.checkPaymentHistory();
		}
	};

	handleInternalTransactions = txHash => {
		const { withdrawalPendingValue } = this.state;
		const networkID = Networks[Engine.context.NetworkController.state.provider.type].networkId.toString();
		const newInternalTxs = Engine.context.TransactionController.state.internalTransactions || [];
		newInternalTxs.push({
			time: Date.now(),
			status: 'confirmed',
			paymentChannelTransaction: true,
			networkID,
			transaction: {
				from: CONTRACTS[networkID],
				to: Engine.context.PreferencesController.state.selectedAddress,
				value: BNToHex(withdrawalPendingValue)
			},
			transactionHash: txHash
		});
		return newInternalTxs;
	};

	checkStatus() {
		const { runtime, status, depositPending, withdrawalPending } = this.state;
		const newStatus = {
			reset: status.reset
		};

		if (runtime) {
			if (depositPending && runtime.deposit.submitted) {
				if (!runtime.deposit.detected) {
					newStatus.type = 'DEPOSIT_PENDING';
				} else {
					newStatus.type = 'DEPOSIT_SUCCESS';
					newStatus.txHash = runtime.deposit.transactionHash;
					this.setState({ depositPending: false });
				}
			}
			if (withdrawalPending && runtime.withdrawal.submitted) {
				if (!runtime.withdrawal.detected) {
					newStatus.type = 'WITHDRAWAL_PENDING';
				} else {
					newStatus.type = 'WITHDRAWAL_SUCCESS';
					newStatus.txHash = runtime.withdrawal.transactionHash;
					const newInternalTxs = this.handleInternalTransactions(newStatus.txHash);
					Engine.context.TransactionController.update({ internalTransactions: newInternalTxs });
					this.setState({ withdrawalPending: false, withdrawalPendingValue: undefined });
				}
			}
		}

		if (newStatus.type !== status.type) {
			newStatus.reset = true;
			if (newStatus.type && newStatus.type !== 'DEPOSIT_PENDING') {
				const notification_type = newStatus.type
					.toLowerCase()
					.split('_')
					.reverse()
					.join('_');
				hideMessage();
				setTimeout(() => {
					NotificationManager.showInstantPaymentNotification(notification_type);
				}, 300);
			}
		}
		this.setState({ status: newStatus });
	}

	deposit = async ({ depositAmount }) => {
		const { channelState } = this.state;
		if (this.state.blocked || hasPendingOps(channelState)) {
			throw new Error('still_blocked');
		}
		try {
			const { connext } = this.state;
			const data = {
				amountWei: toWei(depositAmount).toString(),
				amountToken: '0'
			};
			await connext.deposit(data);
			this.setState({ depositPending: true });
		} catch (e) {
			this.logCurrentState('PC::deposit');
			Logger.error(e, 'PC::deposit');
			throw e;
		}
	};

	send = async ({ sendAmount, sendRecipient }) => {
		let amount = toWei(sendAmount).toString();

		const {
			connext,
			channelState: { balanceTokenUser }
		} = this.state;

		const maxAmount = balanceTokenUser;

		if (sendAmount.toString() === this.getBalance()) {
			amount = maxAmount;
		}

		if (toBN(amount).gt(toBN(maxAmount))) {
			throw new Error('insufficient_balance');
		}

		try {
			const data = {
				meta: {
					purchaseId: 'payment'
				},
				payments: [
					{
						recipient: sendRecipient.toLowerCase(),
						amountWei: '0',
						amountToken: amount
					}
				]
			};
			await connext.buy(data);
		} catch (e) {
			this.logCurrentState('PC::buy');
			Logger.error(e, 'PC::buy');
		}
	};

	withdrawAll = async () => {
		try {
			const {
				connext,
				exchangeRate,
				channelState: { balanceWeiUser, balanceTokenUser }
			} = this.state;
			const withdrawalVal = {
				exchangeRate,
				withdrawalWeiUser: balanceWeiUser,
				tokensToSell: balanceTokenUser,
				withdrawalTokenUser: '0',
				weiToSell: '0',
				recipient: this.selectedAddress.toLowerCase()
			};

			await connext.withdraw(withdrawalVal);
			this.setState({ withdrawalPending: true, withdrawalPendingValue: toWei(renderFromWei(balanceTokenUser)) });
		} catch (e) {
			this.logCurrentState('PC::withdraw');
			Logger.error(e, 'PC::withdraw');
		}
	};

	stop() {
		this.state && this.state.connext && this.state.connext.stop && this.state.connext.stop();
		clearTimeout(this.autoswapHandler);
	}

	logCurrentState = prefix => {
		if (!__DEV__) return;
		Logger.log(`${prefix}:error - channelState:`, this.state.channelState);
		Logger.log(`${prefix}:error - connextState:`, this.state.connextState);
		Logger.log(`${prefix}:error - runtime:`, this.state.runtime);
		Logger.log(`${prefix}:error - exchangeRate:`, this.state.exchangeRate);
	};
}

let client = null;
let reloading = false;

const instance = {
	/**
	 * Method that initializes the connext client for a
	 * specific address, along with all the listeners required
	 */
	async init(address) {
		const { provider } = Engine.context.NetworkController.state;
		if (SUPPORTED_NETWORKS.indexOf(provider.type) !== -1) {
			initListeners();
			Logger.log('PC::Initialzing payment channels');
			client = new PaymentChannelsClient(address);
			try {
				Logger.log('PC::setConnext', provider);
				await client.setConnext(provider);
				Logger.log('PC::pollConnextState');
				await client.pollConnextState();
				Logger.log('PC::pollAndSwap');
				await client.pollAndSwap();
			} catch (e) {
				client.logCurrentState('PC::init');
				Logger.error(e, 'PC::init');
			}
		}
	},
	/**
	 * Method that returns the state of the client
	 * specifically the current status and balance
	 */
	getState: () => ({
		balance: client.getBalance(),
		status: client.state.status,
		transactions: client.state.transactions
	}),
	/**
	 * Method that stops the client from running
	 * and removes all the event listeners associated with it
	 */
	stop: () => {
		if (client) {
			client.stop();
			removeListeners();
			hub.removeAllListeners();
		}
	},
	/**
	 * Method that handles deposits
	 */
	deposit: ({ depositAmount }) => client.deposit({ depositAmount }),
	/**
	 * Method that requests the hub to withdraw all the funds
	 * from the channel to the selected address
	 */
	withdrawAll: () => client.withdrawAll(),
	/**
	 * Method that allows you to send
	 * a payment of a specific amount,
	 * to a specific recipient
	 */
	send: ({ sendAmount, sendRecipient }) => {
		client.send({ sendAmount, sendRecipient });
	},
	/**
	 * Function that returns the value of the minimum deposit
	 * based on the current ETH conversion rate
	 */
	getMinimumDepositFiat: () => {
		if (client.state) {
			const { exchangeRate } = client.state;
			if (exchangeRate) {
				const ETH = parseFloat(exchangeRate);
				return (ETH * MIN_DEPOSIT_ETH).toFixed(2).toString();
			}
		}
		return undefined;
	},
	/**
	 * Function that returns the value of the maximum deposit
	 * based on the current ETH conversion rate
	 */
	getMaximumDepositEth: () => {
		if (client.state) {
			const { exchangeRate } = client.state;
			if (exchangeRate) {
				const ETH = parseFloat(exchangeRate);
				return (MAX_DEPOSIT_TOKEN / ETH).toFixed(2).toString();
			}
		}
		return undefined;
	},
	/**
	 *	Returns the current exchange rate for SAI / ETH
	 */
	getExchangeRate: () => (client && client.state && client.state.exchangeRate) || 0,
	/**
	 *	Returns whether the address has transactions in channel
	 */
	addressHasTransactions: async address => {
		if (client) return true;
		let hasBalance;
		const { provider } = Engine.context.NetworkController.state;
		if (SUPPORTED_NETWORKS.indexOf(provider.type) === -1) return false;
		const tempClient = new PaymentChannelsClient(address);
		try {
			await tempClient.setConnext(provider);
			await tempClient.startConnext();
			const paymentHistory = await tempClient.state.connext.getPaymentHistory();
			hasBalance = paymentHistory.length > 0;
		} catch (e) {
			hasBalance = false;
		}
		tempClient.stop();
		return hasBalance;
	},
	/**
	 *	Minimum deposit amount in ETH
	 */
	MIN_DEPOSIT_ETH,
	/**
	 *	MAX deposit amount in USD
	 */
	MAX_DEPOSIT_TOKEN,
	/**
	 *	Event emitter instance that allows to subscribe
	 *  to the events emitted by the instance
	 */
	hub,
	/**
	 * returns the entire state of the client
	 * only used for debugging purposes
	 */
	dump: () => (client && client.state) || {}
};

const reloadClient = () => {
	if (!reloading) {
		reloading = true;
		if (client) {
			client.stop();
			removeListeners();
		}
		setTimeout(() => {
			instance.init(Engine.context.PreferencesController.state.selectedAddress);
			setTimeout(() => {
				reloading = false;
			}, 1000);
		}, 1000);
	}
};

const onPaymentConfirm = async request => {
	try {
		const balance = parseFloat(instance.getState().balance);
		const sendAmount = parseFloat(request.amount);
		if (balance < sendAmount) {
			hub.emit('payment::error', 'insufficient_balance');
		} else {
			await instance.send({ sendAmount: request.amount, sendRecipient: request.to });
			hub.emit('payment::complete', request);
		}
	} catch (e) {
		hub.emit('payment::error', e.toString());
	}
};

function initListeners() {
	Engine.context.TransactionController.hub.on('networkChange', reloadClient);
	Engine.context.PreferencesController.subscribe(reloadClient);
	hub.on('payment::confirm', onPaymentConfirm);
}

function removeListeners() {
	Engine.context.TransactionController.hub.removeListener('networkChange', reloadClient);
	Engine.context.PreferencesController.unsubscribe(reloadClient);
	hub.removeListener('payment::confirm', onPaymentConfirm);
}

export default instance;
