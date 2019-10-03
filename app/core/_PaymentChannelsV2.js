import Logger from '../util/Logger';
// eslint-disable-next-line
import * as connext from '@connext/client';
import tokenArtifacts from './InstaPay/contracts/ERC20Mintable.json';

// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import { Currency, inverse, store } from './InstaPay/utils';
import AppConstants from './AppConstants';
import { Contract, ethers as eth } from 'ethers';
import { AddressZero } from 'ethers/constants';
import Engine from './Engine';

const { MIN_DEPOSIT_ETH, MAX_DEPOSIT_TOKEN, SUPPORTED_NETWORKS } = AppConstants.CONNEXT;
const API_URL = 'indra.connext.network/api';

// Constants for channel max/min - this is also enforced on the hub
// const WITHDRAW_ESTIMATED_GAS = toBN("300000");
// const DEPOSIT_ESTIMATED_GAS = toBN("25000");
// const MAX_CHANNEL_VALUE = Currency.DAI(MAX_DEPOSIT_TOKEN.toString());

// it is important to add a default payment
// profile on initial load in the case the
// user is being paid without depositing, or
// in the case where the user is redeeming a link

// NOTE: in the redeem controller, if the default payment is
// insufficient, then it will be updated. the same thing
// happens in autodeposit, if the eth deposited > deposit
// needed for autoswap
// const DEFAULT_COLLATERAL_MINIMUM = Currency.DAI("5");
// const DEFAULT_AMOUNT_TO_COLLATERALIZE = Currency.DAI("10");

const hub = new EventEmitter();
let client = null;
let reloading = false;
const mnemonic = 'hard fashion film sting orange phone tank rack green tiger online eight';

/**
 * Class that wraps the connext client for
 * payment channels
 */
class InstaPay {
	constructor(mnemonic, network) {
		const swapRate = '314.08';
		this.state = {
			ready: false,
			address: '',
			balance: {
				channel: {
					ether: Currency.ETH('0', swapRate),
					token: Currency.DAI('0', swapRate),
					total: Currency.ETH('0', swapRate)
				},
				onChain: {
					ether: Currency.ETH('0', swapRate),
					token: Currency.DAI('0', swapRate),
					total: Currency.ETH('0', swapRate)
				}
			},
			ethprovider: null,
			freeBalanceAddress: null,
			loadingConnext: true,
			maxDeposit: null,
			minDeposit: null,
			pending: { type: 'null', complete: true, closed: true },
			sendScanArgs: { amount: null, recipient: null },
			swapRate,
			token: null,
			xpub: '',
			tokenProfile: null
		};

		this.initialize(mnemonic, network);
	}

	initialize = async (mnemonic, network) => {
		const cfPath = "m/44'/60'/0'/25446";
		const ethProviderUrl = `https://${network}.${API_URL}/ethprovider`;
		const ethprovider = new eth.providers.JsonRpcProvider(ethProviderUrl);
		const cfWallet = eth.Wallet.fromMnemonic(mnemonic, cfPath).connect(ethprovider);

		const options = {
			mnemonic,
			nodeUrl: `wss://${network}.${API_URL}/messaging`,
			ethProviderUrl,
			store,
			logLevel: 5
		};

		// Wait for channel to be available
		const channelIsAvailable = async channel => {
			const chan = await channel.getChannel();
			return chan && chan.available;
		};

		const channel = await connext.connect(options);
		while (!(await channelIsAvailable(channel))) {
			await new Promise(res => setTimeout(() => res(), 1000));
		}

		const freeBalanceAddress = channel.freeBalanceAddress || channel.myFreeBalanceAddress;
		const connextConfig = await channel.config();
		const token = new Contract(connextConfig.contractAddresses.Token, tokenArtifacts.abi, cfWallet);
		const swapRate = await channel.getLatestSwapRate(AddressZero, token.address);
		const invSwapRate = inverse(swapRate);

		Logger.log(`Client created successfully!`);
		Logger.log(` - Public Identifier: ${channel.publicIdentifier}`);
		Logger.log(` - Account multisig address: ${channel.opts.multisigAddress}`);
		Logger.log(` - CF Account address: ${cfWallet.address}`);
		Logger.log(` - Free balance address: ${freeBalanceAddress}`);
		Logger.log(` - Token address: ${token.address}`);
		Logger.log(` - Swap rate: ${swapRate} or ${invSwapRate}`);

		channel.subscribeToSwapRates(AddressZero, token.address, res => {
			if (!res || !res.swapRate) return;
			Logger.log(`Got swap rate upate: ${this.state.swapRate} -> ${res.swapRate}`);
			this.setState({ swapRate: res.swapRate });
		});

		this.setState({
			address: cfWallet.address,
			channel,
			ethprovider,
			freeBalanceAddress,
			loadingConnext: false,
			swapRate,
			token,
			wallet: cfWallet,
			xpub: channel.publicIdentifier
		});

		// await this.startPoller();
	};

	setState = data => {
		Object.keys(data).forEach(key => {
			this.state[key] = data[key];
		});
	};
}

const instance = {
	/**
	 * Method that initializes the connext client for a
	 * specific address, along with all the listeners required
	 */
	async init() {
		const { provider } = Engine.context.NetworkController.state;
		if (SUPPORTED_NETWORKS.indexOf(provider.type) !== -1) {
			initListeners();
			Logger.log('PC::Initialzing payment channels');
			try {
				client = new InstaPay(mnemonic, provider.type);
			} catch (e) {
				client.logCurrentState('PC::init');
				Logger.error('PC::init', e);
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
	 *	Returns the current exchange rate for DAI / ETH
	 */
	getExchangeRate: () => (client && client.state && client.state.exchangeRate) || 0,
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
			const { provider } = Engine.context.NetworkController.state;
			client = new InstaPay(mnemonic, provider.type);
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
