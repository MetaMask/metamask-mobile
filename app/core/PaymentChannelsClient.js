import Engine from './Engine';
import Logger from '../util/Logger';
// eslint-disable-next-line import/no-namespace
import * as Connext from 'connext';
import EthContract from 'ethjs-contract';
import EthQuery from 'ethjs-query';
import TransactionsNotificationManager from './TransactionsNotificationManager';
import { hideMessage } from 'react-native-flash-message';
import { toWei, toBN } from '../util/number';
// eslint-disable-next-line
const tokenAbi = require('../../abi/humanToken.json');

// eslint-disable-next-line
const createInfuraProvider = require('eth-json-rpc-infura/src/createProvider');
const { Big } = Connext.big;
const { CurrencyType, CurrencyConvertable } = Connext.types;
const { getExchangeRates, hasPendingOps } = new Connext.Utils();
// Constants for channel max/min - this is also enforced on the hub
const DEPOSIT_ESTIMATED_GAS = Big('700000'); // 700k gas
const WEI_PER_ETHER = Big(1000000000000000000);
const HUB_EXCHANGE_CEILING = WEI_PER_ETHER.mul(Big(69)); // 69 TST
//const CHANNEL_DEPOSIT_MAX = WEI_PER_ETHER.mul(Big(30)); // 30 TST
const MAX_GAS_PRICE = Big('20000000000'); // 20 gWei

function byteArrayToHex(value) {
	const HexCharacters = '0123456789abcdef';
	const result = [];
	for (let i = 0; i < value.length; i++) {
		const v = value[i];
		result.push(HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f]);
	}
	return '0x' + result.join('');
}

class PaymentChannelClient {
	constructor() {
		const { provider } = Engine.context.NetworkController.state;

		this.state = {
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
			},
			browserMinimumBalance: null
		};
	}

	setState(data) {
		Object.keys(data).forEach(key => {
			this[key] = data[key];
		});
	}

	getExternalWallet() {
		const { KeyringController } = Engine.context;
		return {
			external: true,
			address: this.props.selectedAddress,
			getAddress: () => Promise.resolve(this.props.selectedAddress),
			getBalance: block => this.state.ethprovider.getBalance(this.props.selectedAddress, block),
			signMessage: message => {
				const hexMessage = byteArrayToHex(message);
				return KeyringController.signPersonalMessage({ data: hexMessage, from: this.props.selectedAddress });
			}
		};
	}

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
		const opts = {
			hubUrl,
			externalWallet: this.getExternalWallet(),
			user: this.props.selectedAddress,
			web3Provider: Engine.context.NetworkController.provider
		};

		Logger.log('Setting up connext with opts:', opts);

		// *** Instantiate the connext client ***
		try {
			const connext = await Connext.getConnextClient(opts);

			Logger.log(`Successfully set up connext! Connext config:`);
			Logger.log(`  - tokenAddress: ${connext.opts.tokenAddress}`);
			Logger.log(`  - hubAddress: ${connext.opts.hubAddress}`);
			Logger.log(`  - contractAddress: ${connext.opts.contractAddress}`);
			Logger.log(`  - ethNetworkId: ${connext.opts.ethNetworkId}`);
			Logger.log(`  - public address: ${this.state.address}`);

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

	async setTokenContract() {
		try {
			const { tokenAddress, ethprovider } = this.state;

			const contract = new EthContract(ethprovider);
			const tokenContract = contract(tokenAbi).at(tokenAddress);
			this.setState({ tokenContract });
		} catch (e) {
			Logger.log('Error setting token contract', e);
		}
	}

	async pollConnextState() {
		const { connext } = this.state;
		// register connext listeners
		connext.on('onStateChange', state => {
			Logger.log('NEW STATE', state);
			this.setState({
				channelState: state.persistent.channel,
				connextState: state,
				runtime: state.runtime,
				exchangeRate: state.runtime.exchangeRate ? state.runtime.exchangeRate.rates.USD : 0
			});
			this.checkStatus();
		});
		// start polling
		await connext.start();
		this.setState({ loadingConnext: false });
	}

	pollAndSwap = async () => {
		await this.autoSwap();
		setTimeout(() => {
			this.pollAndSwap();
		}, 1000);
	};

	async setBrowserWalletMinimumBalance() {
		const { connextState } = this.state;
		// let gasEstimateJson = await utils.fetchJson({ url: `https://ethgasstation.info/json/ethgasAPI.json` });
		// let providerGasPrice = await ethprovider.getGasPrice();
		// let currentGasPrice = Math.round((gasEstimateJson.average / 10) * 2); // multiply gas price by two to be safe
		// dont let gas price be any higher than the max
		// currentGasPrice = utils.parseUnits(minBN(Big(currentGasPrice.toString()), MAX_GAS_PRICE).toString(), "gwei");
		// unless it really needs to be: average eth gas station price w ethprovider's
		// currentGasPrice = currentGasPrice.add(providerGasPrice).div(ethers.constants.Two);

		const providerGasPrice = MAX_GAS_PRICE; // hardcode for now
		Logger.log(`Gas Price = ${providerGasPrice}`);

		// default connext multiple is 1.5, leave 2x for safety
		const totalDepositGasWei = DEPOSIT_ESTIMATED_GAS.mul(Big(2)).mul(providerGasPrice);

		// add dai conversion
		const minConvertable = new CurrencyConvertable(CurrencyType.WEI, totalDepositGasWei, () =>
			getExchangeRates(connextState)
		);
		const browserMinimumBalance = {
			wei: minConvertable.toWEI().amount,
			dai: minConvertable.toUSD().amount
		};
		this.setState({ browserMinimumBalance });
		return browserMinimumBalance;
	}

	async autoSwap() {
		const { channelState, connextState } = this.state;
		if (!connextState || hasPendingOps(channelState)) {
			return;
		}
		const weiBalance = Big(channelState.balanceWeiUser);
		const tokenBalance = Big(channelState.balanceTokenUser);
		const hubTokenBalance = Big(channelState.balanceTokenHub);
		if (channelState && weiBalance.gt(Big('0')) && tokenBalance.lte(HUB_EXCHANGE_CEILING)) {
			if (hubTokenBalance.gt(weiBalance)) {
				await this.state.connext.exchange(channelState.balanceWeiUser, 'wei');
			}
		}
	}

	async checkStatus() {
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

	deposit = async () => {
		if (isNaN(this.state.depositAmount) || this.state.depositAmount.trim() === '') {
			return;
		}

		const depositAmount = parseFloat(this.state.depositAmount);
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
			const params = {
				amountWei: toWei(this.state.depositAmount).toString(),
				amountToken: '0'
			};
			Logger.log('About to deposit', params);
			await connext.deposit(params);
			this.setState({ depositAmount: '' });
			Logger.log('Deposit succesful');
			TransactionsNotificationManager.showInstantPaymentNotification('pending_deposit');
		} catch (e) {
			Logger.log('Deposit error', e);
		}
	};

	send = async params => {
		if (isNaN(this.state.sendAmount) || this.state.sendAmount.trim() === '') {
			return;
		}

		if (!this.state.sendRecipient) {
			return;
		}

		const amount = toWei(this.state.sendAmount).toString();
		const maxAmount = this.state.channelState.balanceTokenUser;

		if (toBN(amount).gt(toBN(maxAmount))) {
			throw new Error('Insufficient balance');
		}

		try {
			const connext = this.state.connext;
			const params = {
				meta: {
					purchaseId: 'payment'
				},
				payments: [
					{
						recipient: this.state.sendRecipient.toLowerCase(),
						amountWei: '0',
						amountToken: toWei(this.state.sendAmount).toString()
					}
				]
			};
			Logger.log('Sending ', params);
			await connext.buy(params);
			Logger.log('Send succesful');
		} catch (e) {
			Logger.log('buy error error', e);
		}
	};

	swapToDAI = async amount => {
		try {
			const connext = this.state.connext;
			Logger.log('swapping eth to dai');
			await connext.exchange(amount, 'wei');
			Logger.log('Swap to DAI succesful');
		} catch (e) {
			Logger.log('buy error error', e);
		}
	};

	swapToETH = async () => {
		try {
			const connext = this.state.connext;
			Logger.log('swapping DAI  to ETH');
			await connext.exchange(this.state.channelState.balanceTokenUser, 'token');
			Logger.log('Swap to ETH succesful');
		} catch (e) {
			Logger.log('buy error error', e);
		}
	};

	withdraw = async params => {
		try {
			const connext = this.state.connext;
			const withdrawalVal = {
				exchangeRate: this.state.runtime.exchangeRate.rates.USD,
				withdrawalWeiUser: this.state.channelState.balanceWeiUser,
				tokensToSell: this.state.channelState.balanceTokenUser,
				...params
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

const instance = {
	async init() {
		this.client = new PaymentChannelClient();
		await this.client.setConnext();
		await this.client.setTokenContract();
		await this.client.pollConnextState();
		await this.client.setBrowserWalletMinimumBalance();
		await this.client.pollAndSwap();
	},
	maxAmount: this.client.state && this.client.state.channelState && this.client.state.channelState.balanceTokenUser,
	stop: () => this.client.stop(),
	deposit: params => this.client.deposit(params),
	withdraw: params => this.client.withdraw(params),
	send: params => this.client.buy(params)
};

export default instance;
