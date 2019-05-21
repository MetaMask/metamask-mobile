import Engine from './Engine';
import Logger from '../util/Logger';
import AsyncStorage from '@react-native-community/async-storage';
// eslint-disable-next-line
import * as Connext from 'indra/modules/client';
import EthQuery from 'ethjs-query';
import TransactionsNotificationManager from './TransactionsNotificationManager';
import { hideMessage } from 'react-native-flash-message';
import { toWei, toBN, renderFromWei } from '../util/number';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import AppConstants from './AppConstants';
import byteArrayToHex from '../util/bytes';

// eslint-disable-next-line
const createInfuraProvider = require('eth-json-rpc-infura/src/createProvider');

const { hasPendingOps } = new Connext.Utils();
// Constants for channel max/min - this is also enforced on the hub
const WEI_PER_ETHER = toBN('1000000000000000000');
const { HUB_EXCHANGE_CEILING_TOKEN, MIN_DEPOSIT_ETH, MAX_DEPOSIT_TOKEN } = AppConstants.CONNEXT;

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
			loadingConnext: true,
			hubUrl: null,
			tokenAddress: null,
			contractAddress: null,
			hubWalletAddress: null,
			ethprovider: null,
			tokenContract: null,
			connext: null,
			channelManagerAddress: null,
			ethNetworkId: null,
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
			}
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

		const publicUrl = 'https://daicard.io';
		let hubUrl;
		const ethprovider = new EthQuery(infuraProvider);
		switch (type) {
			case 'rinkeby':
				hubUrl = `${publicUrl}/api/rinkeby/hub`;
				break;
			case 'mainnet':
				hubUrl = `${publicUrl}/api/mainnet/hub`;
				break;
			default:
				throw new Error(`Unrecognized network: ${type}`);
		}

		const { KeyringController } = Engine.context;
		const opts = {
			hubUrl,
			externalWallet: {
				external: true,
				address: this.selectedAddress,
				getAddress: () => Promise.resolve(this.selectedAddress),
				getBalance: block => this.state.ethprovider.getBalance(this.selectedAddress, block),
				signMessage: message => {
					const hexMessage = byteArrayToHex(message);
					return KeyringController.signPersonalMessage({ data: hexMessage, from: this.selectedAddress });
				}
			},
			web3Provider: Engine.context.NetworkController.provider
		};

		Logger.log('Setting up connext with opts:', opts);

		// *** Instantiate the connext client ***
		try {
			const connext = await Connext.createClient(opts);

			Logger.log(`Successfully set up connext! Connext config:`);
			Logger.log(`  - tokenAddress: ${connext.opts.tokenAddress}`);
			Logger.log(`  - hubAddress: ${connext.opts.hubAddress}`);
			Logger.log(`  - contractAddress: ${connext.opts.contractAddress}`);
			Logger.log(`  - ethNetworkId: ${connext.opts.ethNetworkId}`);
			Logger.log(`  - public address: ${this.selectedAddress}`);

			this.setState({
				connext,
				tokenAddress: connext.opts.tokenAddress,
				channelManagerAddress: connext.opts.contractAddress,
				hubWalletAddress: connext.opts.hubAddress,
				ethNetworkId: connext.opts.ethNetworkId,
				ethprovider
			});
		} catch (e) {
			Logger.log('error', e);
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

	async pollConnextState() {
		const { connext } = this.state;
		// register connext listeners
		connext.on('onStateChange', state => {
			this.checkForBalanceChange(state);
			this.setState({
				ready: true,
				channelState: state.persistent.channel,
				connextState: state,
				runtime: state.runtime,
				exchangeRate: state.runtime.exchangeRate ? state.runtime.exchangeRate.rates.USD : 0
			});
			this.checkStatus();
			hub.emit('state::change', {
				balance: this.getBalance(),
				status: this.state.status,
				ready: true
			});
		});
		// start polling
		await connext.start();
		this.setState({ loadingConnext: false });
	}

	checkPaymentHistory = async () => {
		const paymentHistory = await this.state.connext.getPaymentHistory();
		const lastKnownPaymentIDStr = await AsyncStorage.getItem('@MetaMask:lastKnownInstantPaymentID');
		let lastKnownPaymentID = 0;

		const latestPayment = paymentHistory.find(
			payment => payment.recipient.toLowerCase() === this.selectedAddress.toLowerCase()
		);
		if (latestPayment) {
			const latestPaymentID = parseInt(latestPayment.id, 10);
			if (lastKnownPaymentIDStr) {
				lastKnownPaymentID = parseInt(lastKnownPaymentIDStr, 10);
				if (lastKnownPaymentID < latestPaymentID) {
					const ret = toBN(latestPayment.amount.amountToken).div(WEI_PER_ETHER);
					const amountToken = ret
						.toNumber()
						.toFixed(2)
						.toString();
					Logger.log('PAYMENT TOKEN IN USD', amountToken);
					hideMessage();
					setTimeout(() => {
						TransactionsNotificationManager.showIncomingPaymentNotification(amountToken);
					}, 300);
				}
			}
			await AsyncStorage.setItem('@MetaMask:lastKnownInstantPaymentID', latestPaymentID.toString());
		}
	};

	pollAndSwap = async () => {
		await this.autoSwap();
		setTimeout(() => {
			this.pollAndSwap();
		}, 1000);
	};

	async autoSwap() {
		const { channelState, connextState } = this.state;
		if (!connextState || hasPendingOps(channelState)) {
			return;
		}
		const weiBalance = toBN(channelState.balanceWeiUser);
		const tokenBalance = toBN(channelState.balanceTokenUser);
		const hubTokenBalance = toBN(channelState.balanceTokenHub);
		if (channelState && weiBalance.gt(toBN('0')) && tokenBalance.lte(HUB_EXCHANGE_CEILING)) {
			if (hubTokenBalance.gt(weiBalance)) {
				await this.state.connext.exchange(channelState.balanceWeiUser, 'wei');
			}
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

	checkStatus() {
		const { runtime, status } = this.state;
		const newStatus = {
			reset: status.reset
		};

		if (runtime) {
			// Logger.log(`Hub Sync results: ${JSON.stringify(runtime.syncResultsFromHub[0], null, 2)}`);
			if (runtime.deposit.submitted) {
				if (!runtime.deposit.detected) {
					newStatus.type = 'DEPOSIT_PENDING';
				} else {
					newStatus.type = 'DEPOSIT_SUCCESS';
					newStatus.txHash = runtime.deposit.transactionHash;
				}
			}
			if (runtime.withdrawal.submitted) {
				if (!runtime.withdrawal.detected) {
					newStatus.type = 'WITHDRAWAL_PENDING';
				} else {
					newStatus.type = 'WITHDRAWAL_SUCCESS';
					newStatus.txHash = runtime.withdrawal.transactionHash;
				}
			}
		}

		if (newStatus.type !== status.type) {
			newStatus.reset = true;
			Logger.log(`New channel status! ${JSON.stringify(newStatus)}`);
			Logger.log(`STATUS TYPE!`, newStatus.type);
			if (newStatus.type && newStatus.type !== 'DEPOSIT_PENDING') {
				const notification_type = newStatus.type
					.toLowerCase()
					.split('_')
					.reverse()
					.join('_');
				hideMessage();
				setTimeout(() => {
					TransactionsNotificationManager.showInstantPaymentNotification(notification_type);
				}, 300);
			}
		}
		this.setState({ status: newStatus });
	}

	deposit = async params => {
		if (isNaN(params.depositAmount) || params.depositAmount.trim() === '') {
			throw new Error('Invalid amount');
		}

		const depositAmount = parseFloat(params.depositAmount);
		const maxDepositAmount = 0.12;
		const minDepositAmount = 0.03;
		if (depositAmount > maxDepositAmount) {
			throw new Error('The max. deposit allowed for now it is 0.12 ETH. Try with a lower amount');
		}

		if (depositAmount < minDepositAmount) {
			throw new Error('The max. deposit allowed for now it is 0.03 ETH. Try with a lower amount');
		}

		try {
			const connext = this.state.connext;
			const data = {
				amountWei: toWei(params.depositAmount).toString(),
				amountToken: '0'
			};
			Logger.log('About to deposit', data);
			await connext.deposit(data);
			Logger.log('Deposit succesful');
			TransactionsNotificationManager.showInstantPaymentNotification('pending_deposit');
		} catch (e) {
			Logger.log('Deposit error', e);
		}
	};

	send = async params => {
		if (isNaN(params.sendAmount) || params.sendAmount.trim() === '') {
			throw new Error('You need to enter the amount');
		}

		if (!params.sendRecipient) {
			throw new Error('You need to enter a recepient');
		}

		const amount = toWei(params.sendAmount).toString();
		const maxAmount = this.state.channelState.balanceTokenUser;

		if (toBN(amount).gt(toBN(maxAmount))) {
			throw new Error('Insufficient balance');
		}

		try {
			const connext = this.state.connext;
			const data = {
				meta: {
					purchaseId: 'payment'
				},
				payments: [
					{
						recipient: params.sendRecipient.toLowerCase(),
						amountWei: '0',
						amountToken: toWei(params.sendAmount).toString()
					}
				]
			};
			Logger.log('Sending ', data);
			await connext.buy(data);
			Logger.log('Send succesful');
		} catch (e) {
			Logger.log('buy error error', e);
		}
	};

	withdrawAll = async () => {
		try {
			const connext = this.state.connext;
			const withdrawalVal = {
				exchangeRate: this.state.runtime.exchangeRate.rates.USD,
				withdrawalWeiUser: this.state.channelState.balanceWeiUser,
				tokensToSell: this.state.channelState.balanceTokenUser,
				withdrawalTokenUser: '0',
				weiToSell: '0',
				recipient: this.selectedAddress.toLowerCase()
			};

			await connext.withdraw(withdrawalVal);
			Logger.log('withdraw succesful');
		} catch (e) {
			Logger.log('withdraw error', e);
		}
	};

	stop() {
		this.state.connext.stop();
	}
}

let client = null;
let reloading = false;

const instance = {
	async init(address) {
		initListeners();
		client = new PaymentChannelsClient(address);
		const { provider } = Engine.context.NetworkController.state;
		await client.setConnext(provider);
		await client.pollConnextState();
		await client.pollAndSwap();
	},
	getInstance: () => this,
	getState: () => ({
		balance: client.getBalance(),
		status: client.state.status,
		ready: true
	}),
	stop: () => client.stop(),
	deposit: params => client.deposit(params),
	withdrawAll: () => client.withdrawAll(),
	send: params => {
		client.send(params);
	},
	getStatus: () => client.state && client.state.status,
	getMinimumDepositFiat: () => {
		if (client.state.runtime && client.state.runtime.exchangeRate && client.state.runtime.exchangeRate.rates) {
			const ETH = parseFloat(client.state.runtime.exchangeRate.rates.USD);
			return (ETH * MIN_DEPOSIT_ETH).toFixed(2).toString();
		}
		return '0.00';
	},
	getMaximumDepositEth: () => {
		if (client.state.runtime && client.state.runtime.exchangeRate && client.state.runtime.exchangeRate.rates) {
			const ETH = parseFloat(client.state.runtime.exchangeRate.rates.USD);
			return (MAX_DEPOSIT_TOKEN / ETH).toFixed(2).toString();
		}
		return '0.00';
	},
	MIN_DEPOSIT_ETH,
	MAX_DEPOSIT_TOKEN,
	hub
};

hub.on('payment::confirm', async request => {
	Logger.log(instance, instance.send, request);
	await instance.send({ sendAmount: request.amount, sendRecipient: request.to });
	hub.emit('payment::complete', request);
});

const reloadClient = () => {
	if (!reloading) {
		reloading = true;
		instance.stop();
		setTimeout(() => {
			instance.init(Engine.context.PreferencesController.state.selectedAddress);
			setTimeout(() => {
				reloading = false;
			}, 1000);
		}, 1000);
	}
};

function initListeners() {
	Engine.context.TransactionController.hub.on('networkChange', reloadClient);
	Engine.context.PreferencesController.subscribe(reloadClient);
}

export default instance;
