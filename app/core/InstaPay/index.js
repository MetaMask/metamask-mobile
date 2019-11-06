import Logger from '../../util/Logger';
// eslint-disable-next-line
import { connect, utils } from '@connext/client';
import tokenArtifacts from './contracts/ERC20Mintable.json';
import interval from 'interval-promise';

// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import {
	Currency,
	minBN,
	toBN,
	tokenToWei,
	weiToToken,
	delay,
	inverse,
	decryptMnemonic,
	saveMnemonic,
	backupMnemonic,
	getMnemonicFromBackup
} from './utils';
import Store from './utils/store';
import AppConstants from '../AppConstants';
import { Contract, ethers as eth } from 'ethers';
import { AddressZero, Zero } from 'ethers/constants';
import { formatEther, parseEther, hexlify, randomBytes } from 'ethers/utils';
import Engine from '../Engine';
import AsyncStorage from '@react-native-community/async-storage';
import TransactionsNotificationManager from '../TransactionsNotificationManager';
import { renderFromWei, toWei, fromWei } from '../../util/number';
import { BNToHex } from 'gaba/util';
import { toChecksumAddress } from 'ethereumjs-util';
import Networks from '../../util/networks';
import Encryptor from '../Encryptor';
import PaymentChannelsClient from '../PaymentChannelsClient';

const encryptor = new Encryptor();
const { MIN_DEPOSIT_ETH, MAX_DEPOSIT_TOKEN, SUPPORTED_NETWORKS } = AppConstants.CONNEXT;
const API_URL = 'indra.connext.network/api';

// Constants for channel max/min - this is also enforced on the hub
const WITHDRAW_ESTIMATED_GAS = toBN('300000');
const DEPOSIT_ESTIMATED_GAS = toBN('25000');
const MAX_CHANNEL_VALUE = Currency.DAI(MAX_DEPOSIT_TOKEN.toString());
const MIGRATION_TIMEOUT_MINUTES = 4;
// it is important to add a default payment
// profile on initial load in the case the
// user is being paid without depositing, or
// in the case where the user is redeeming a link

// NOTE: in the redeem controller, if the default payment is
// insufficient, then it will be updated. the same thing
// happens in autodeposit, if the eth deposited > deposit
// needed for autoswap
const DEFAULT_COLLATERAL_MINIMUM = Currency.DAI('10');
const DEFAULT_AMOUNT_TO_COLLATERALIZE = Currency.DAI('20');

const hub = new EventEmitter();
let client = null;
let running = false;
let reloading = false;
let restoring = false;
// eslint-disable-next-line import/no-mutable-exports
let instance = null;

const reloadClient = () => {
	Logger.log('InstaPay :: reloading client');
	if (!reloading) {
		reloading = true;
		if (client) {
			hub.emit('reloading::start');
			instance.stop();
		}
		setTimeout(() => {
			instance.init();
			setTimeout(() => {
				reloading = false;
			}, 1000);
		}, 1000);
	}
};

// THIS TWO MNEMONICS ARE IN A BROKEN STATE
// const mnemonic = 'token face horse fame you love envelope velvet comfort section mask street';
// const mnemonic = 'avocado holiday swamp balcony good clap culture assume erode mask grape observe';
// const mnemonic = 'frequent answer slender job feed spell follow loyal real blade exchange kit';
/**
 * Class that wraps the connext client for
 * payment channels
 */
class InstaPay {
	constructor(mnemonic, network) {
		const swapRate = '100.00';
		this.state = {
			username: '',
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
			maxDeposit: null,
			minDeposit: null,
			pending: { type: 'null', complete: true, closed: true },
			receivingTransferCompleted: false,
			receivingTransferFailed: false,
			receivingTransferStarted: false,
			sendScanArgs: { amount: null, recipient: null },
			swapRate,
			token: null,
			xpub: '',
			tokenProfile: null,
			usernameSynced: false,
			migrating: false,
			migrated: false,
			pendingDeposits: 0,
			balanceToMigrate: 0
		};

		this.start(mnemonic, network);
	}

	start = async (mnemonic, network) => {
		const cfPath = "m/44'/60'/0'/25446";
		const subdomain = network !== 'mainnet' ? `${network}.` : '';
		const ethProviderUrl = `https://${subdomain}${API_URL}/ethprovider`;
		const ethprovider = new eth.providers.JsonRpcProvider(ethProviderUrl);
		const cfWallet = eth.Wallet.fromMnemonic(mnemonic, cfPath).connect(ethprovider);
		const store = await Store.init();
		const options = {
			mnemonic,
			nodeUrl: `wss://${subdomain}indra.connext.network/api/messaging`,
			ethProviderUrl,
			store,
			logLevel: 5
		};

		Logger.log('InstaPay :: about to connect');

		const channel = await connect(options);
		Logger.log('InstaPay :: connect complete ');

		// Wait for channel to be available
		const channelIsAvailable = async channel => {
			const chan = await channel.getChannel();
			return chan && chan.available;
		};

		while (!(await channelIsAvailable(channel))) {
			await new Promise(res => setTimeout(() => res(), 1000));
		}

		Logger.log('PC:Channel is available!');

		const freeBalanceAddress = channel.freeBalanceAddress || channel.myFreeBalanceAddress;
		const token = new Contract(channel.config.contractAddresses.Token, tokenArtifacts.abi, cfWallet);
		const swapRate = await channel.getLatestSwapRate(AddressZero, token.address);

		Logger.log(`Client created successfully!`);
		Logger.log(` - Public Identifier: ${channel.publicIdentifier}`);
		Logger.log(` - Account multisig address: ${channel.opts.multisigAddress}`);
		Logger.log(` - CF Account address: ${cfWallet.address}`);
		Logger.log(` - Free balance address: ${freeBalanceAddress}`);
		Logger.log(` - Token address: ${token.address}`);
		Logger.log(` - Swap rate: ${swapRate}`);

		channel.subscribeToSwapRates(AddressZero, token.address, res => {
			if (!res || !res.swapRate) return;
			Logger.log(`Got swap rate upate: ${this.state.swapRate} -> ${res.swapRate}`);
			this.setState({ swapRate: res.swapRate });
		});

		channel.on('RECIEVE_TRANSFER_STARTED', data => {
			Logger.log('Received RECIEVE_TRANSFER_STARTED event: ', data);
			this.setState({ receivingTransferStarted: true });
		});

		channel.on('RECIEVE_TRANSFER_FINISHED', data => {
			Logger.log('Received RECIEVE_TRANSFER_FINISHED event: ', data);
			this.setState({ receivingTransferCompleted: true });
		});

		channel.on('RECIEVE_TRANSFER_FAILED', data => {
			Logger.log('Received RECIEVE_TRANSFER_FAILED event: ', data);
			this.setState({ receivingTransferFailed: true });
		});

		const savedUsername = await AsyncStorage.getItem('@MetaMask:InstaPayUsername');

		this.setState({
			address: cfWallet.address,
			channel,
			ethprovider,
			freeBalanceAddress,
			swapRate,
			token,
			wallet: cfWallet,
			xpub: channel.publicIdentifier,
			ready: true,
			username: savedUsername || null
		});

		try {
			await this.addDefaultPaymentProfile();
		} catch (e) {
			Logger.error('InstaPay :: Error adding default payment profile...', e);
		}

		await this.startPoller();

		this.runMigrations();
		this.backupIfNecessary();
	};

	backupIfNecessary = async () => {
		const InstaPayBackedUp = await AsyncStorage.getItem('@MetaMask:InstaPayBackedUp');
		if (!InstaPayBackedUp) {
			hub.emit('backup::requested', null);
		}
	};

	runMigrations = async () => {
		// Uncomment for testing purposes!
		// await AsyncStorage.removeItem('@MetaMask:InstaPayVersion');

		const InstaPayVersion = await AsyncStorage.getItem('@MetaMask:InstaPayVersion');
		if (!InstaPayVersion) {
			this.migrationTimeout = setTimeout(() => {
				this.forceFinishMigration();
			}, MIGRATION_TIMEOUT_MINUTES * 60 * 1000);
			this.migrateToV2();
		} else {
			this.setState({ migrated: true });
		}
		// Future migrations can go here...
	};

	migrateToV2 = async () => {
		this.setState({ migrating: true });
		hub.emit('migration::started', null);
		// For each account
		const allKeyrings = Engine.context.KeyringController.state.keyrings;
		const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);
		const v1Client = PaymentChannelsClient;
		Logger.log('InstaPay :: Migration to v2 started...');
		for (const account of accountsOrdered) {
			// Init v1 client
			Logger.log('InstaPay :: Init v1 client for', account);
			await v1Client.init(account);
			Logger.log('InstaPay :: Init completed', account);

			// Wait for channel to be available
			const channelIsReady = () => {
				const { ready } = v1Client.getState();
				Logger.log('InstaPay :: v1 channel is ready?', ready);
				return ready;
			};

			Logger.log('InstaPay :: Wait for v1 channel to be ready for ', account);
			while (!channelIsReady()) {
				await new Promise(res => setTimeout(() => res(), 3000));
			}

			// Check if it has balance > 0
			const { balance } = v1Client.getState();
			Logger.log('InstaPay :: Checking v1 channel balance for ', account);

			Logger.log(`InstaPay :: v1 Channel balance for ${account} is `, balance);
			if (parseFloat(balance) > 0) {
				let addressToWithdraw, newBalanceToMigrate;
				if (this.state.balanceToMigrate + parseFloat(balance) > MAX_DEPOSIT_TOKEN) {
					addressToWithdraw = account;
					newBalanceToMigrate = this.state.balanceToMigrate;
					Logger.log(
						`InstaPay :: Withdrawing v1 ${balance} to ETH account (exceeds max deposit)`,
						addressToWithdraw
					);
				} else {
					addressToWithdraw = this.state.wallet.address;
					newBalanceToMigrate = this.state.balanceToMigrate + parseFloat(balance);
					Logger.log(`InstaPay :: Withdrawing v1 ${balance} to InstaPay`, addressToWithdraw);
				}
				// if true, withdraw to wallet address
				await v1Client.withdrawAll(addressToWithdraw);
				this.setState({
					pendingDeposits: this.state.pendingDeposits + 1,
					balanceToMigrate: newBalanceToMigrate
				});

				Logger.log('InstaPay :: Migration complete for ', account);
			}

			v1Client.stop();
		}

		if (this.state.pendingDeposits === 0) {
			this.finishMigration();
		}
	};

	setState = data => {
		Object.keys(data).forEach(key => {
			this.state[key] = data[key];
		});
		hub.emit('state::change', this.state);
	};

	poll = async () => {
		try {
			await this.refreshBalances();
		} catch (e) {
			Logger.error('InstaPay :: error in refreshBalances', e);
		}
		try {
			await this.autoDeposit();
		} catch (e) {
			Logger.error('InstaPay :: error in autoDeposit', e);
		}

		try {
			await this.autoSwap();
		} catch (e) {
			Logger.error('InstaPay :: error in autoSwap', e);
		}

		try {
			await this.checkPaymentHistory();
		} catch (e) {
			Logger.error('InstaPay :: error in checkPaymentHistory', e);
		}
	};

	startPoller = async () => {
		running = true;
		Logger.log('InstaPay :: Starting poller...');
		Logger.log('InstaPay :: is it ready?...', this.state.ready);
		this.poll();

		interval(async (iteration, stop) => {
			if (!running) {
				Logger.log('InstaPay :: Stopping poller');
				stop();
			}
			this.poll();
		}, 3000);
	};

	checkPaymentHistory = async () => {
		const paymentHistory = await this.state.channel.getTransferHistory();
		const lastKnownPaymentIDStr = await AsyncStorage.getItem('@MetaMask:lastKnownInstantPaymentID');
		let lastKnownPaymentID = 0;
		const latestPayment = paymentHistory.find(
			payment =>
				payment.receiverPublicIdentifier &&
				payment.receiverPublicIdentifier.toLowerCase() === this.state.xpub.toLowerCase()
		);
		if (latestPayment) {
			const latestPaymentID = parseInt(latestPayment.id, 10);
			if (lastKnownPaymentIDStr) {
				lastKnownPaymentID = parseInt(lastKnownPaymentIDStr, 10);
				if (lastKnownPaymentID < latestPaymentID) {
					const amountToken = renderFromWei(latestPayment.amount);
					setTimeout(() => {
						TransactionsNotificationManager.showIncomingPaymentNotification(amountToken);
					}, 300);
					await AsyncStorage.setItem('@MetaMask:lastKnownInstantPaymentID', latestPaymentID.toString());
				}
			} else {
				// For first time flow
				await AsyncStorage.setItem('@MetaMask:lastKnownInstantPaymentID', latestPaymentID.toString());
			}
		}
		this.setState({ transactions: paymentHistory.reverse() });
	};

	addDefaultPaymentProfile = async () => {
		// add the payment profile for tokens only
		// then request collateral of this type
		const { token, channel } = this.state;

		if (!token) {
			Logger.log('No token found, not setting default token payment profile');
			return;
		}
		const tokenProfile = await channel.addPaymentProfile({
			amountToCollateralize: DEFAULT_AMOUNT_TO_COLLATERALIZE.wad.toString(),
			minimumMaintainedCollateral: DEFAULT_COLLATERAL_MINIMUM.wad.toString(),
			assetId: token.address
		});
		this.setState({ tokenProfile });
		Logger.log(`Got a default token profile: ${JSON.stringify(this.state.tokenProfile)}`);
		return tokenProfile;
	};

	refreshBalances = async () => {
		const { address, balance, channel, ethprovider, freeBalanceAddress, swapRate, token } = this.state;
		const gasPrice = await ethprovider.getGasPrice();
		const totalDepositGasWei = DEPOSIT_ESTIMATED_GAS.mul(toBN(2)).mul(gasPrice);
		const totalWithdrawalGasWei = WITHDRAW_ESTIMATED_GAS.mul(gasPrice);
		const minDeposit = Currency.WEI(totalDepositGasWei.add(totalWithdrawalGasWei), swapRate).toETH();
		const maxDeposit = MAX_CHANNEL_VALUE.toETH(swapRate); // Or get based on payment profile?
		this.setState({ maxDeposit, minDeposit });
		if (!channel || !swapRate) {
			return;
		}
		const getTotal = (ether, token) => Currency.WEI(ether.wad.add(token.toETH().wad), swapRate);
		let freeEtherBalance, freeTokenBalance;
		try {
			freeEtherBalance = await channel.getFreeBalance();
			freeTokenBalance = await channel.getFreeBalance(token.address);
		} catch (e) {
			if (e.message.includes(`This probably means that the StateChannel does not exist yet`)) {
				// channel.connext was already called, meaning there should be
				// an existing channel
				const encryptedMnemonic = await AsyncStorage.getItem('@MetaMask:InstaPayMnemonic');
				if (encryptedMnemonic) {
					const mnemonic = await decryptMnemonic(encryptor, encryptedMnemonic);
					await channel.restoreState(mnemonic);
					Logger.log('InstaPay :: Reloading client due to missing state');
					reloadClient();
				}
				return;
			}
			Logger.warn(e);
			return;
		}
		balance.onChain.ether = Currency.WEI(await ethprovider.getBalance(address), swapRate).toETH();
		balance.onChain.token = Currency.DEI(await token.balanceOf(address), swapRate).toDAI();
		balance.onChain.total = getTotal(balance.onChain.ether, balance.onChain.token).toETH();
		balance.channel.ether = Currency.WEI(freeEtherBalance[freeBalanceAddress], swapRate).toETH();
		balance.channel.token = Currency.DEI(freeTokenBalance[freeBalanceAddress], swapRate).toDAI();
		balance.channel.total = getTotal(balance.channel.ether, balance.channel.token).toETH();
		this.setState({ balance });

		// Check for migration pending deposits
		if (this.state.pendingDeposits > 0) {
			// If all the balance has been migrated
			// the migration has been completed succesfully
			// but we need to account for the GAS (withdraw v1 + deposit v2)
			// plus potential ETH price changes
			// That's why we do a 0.50 threshold
			const BALANCE_THRESHOLD = 0.5;

			const currentBal = parseFloat(
				this.state.balance.channel.token.toDAI().format({ decimals: 2, symbol: false })
			);
			const minCurrentBalance = currentBal - BALANCE_THRESHOLD;
			const maxCurrentBalance = currentBal + BALANCE_THRESHOLD;

			if (this.state.balanceToMigrate >= minCurrentBalance && this.state.balanceToMigrate <= maxCurrentBalance) {
				// Delay the completion so the deposit
				// notification is not shown (which might be confusing)
				setTimeout(() => {
					this.finishMigration();
				}, 1000);
			}
		}
	};

	autoDeposit = async () => {
		const { balance, channel, minDeposit, maxDeposit, pending, swapRate, token } = this.state;
		if (!channel) {
			Logger.warn(`Channel not available yet.`);
			return;
		}
		if (balance.onChain.ether.wad.eq(Zero)) {
			Logger.debug(`No on-chain eth to deposit`);
			return;
		}
		if (!pending.complete) {
			Logger.log(`An operation of type ${pending.type} is pending, waiting to deposit`);
			return;
		}

		let nowMaxDeposit = maxDeposit.wad.sub(this.state.balance.channel.total.wad);
		if (nowMaxDeposit.lte(Zero)) {
			Logger.debug(
				`Channel balance (${balance.channel.total.toDAI().format()}) is at or above ` +
					`cap of ${maxDeposit.toDAI(swapRate).format()}`
			);
			return;
		}

		if (balance.onChain.token.wad.gt(Zero)) {
			this.setPending({ type: 'deposit', complete: false, closed: false });
			const amount = minBN([Currency.WEI(nowMaxDeposit, swapRate).toDAI().wad, balance.onChain.token.wad]);
			const depositParams = {
				amount: amount.toString(),
				assetId: token.address.toLowerCase()
			};
			Logger.log(`Depositing ${depositParams.amount} tokens into channel: ${channel.opts.multisigAddress}`);
			const result = await channel.deposit(depositParams);
			await this.refreshBalances();
			Logger.log(`Successfully deposited tokens! Result: ${JSON.stringify(result, null, 2)}`);
			this.setPending({ type: 'deposit', complete: true, closed: false });
		} else {
			Logger.debug(`No tokens to deposit`);
		}

		nowMaxDeposit = maxDeposit.wad.sub(this.state.balance.channel.total.wad);
		if (nowMaxDeposit.lte(Zero)) {
			Logger.debug(
				`Channel balance (${balance.channel.total.toDAI().format()}) is at or above ` +
					`cap of ${maxDeposit.toDAI(swapRate).format()}`
			);
			return;
		}
		if (balance.onChain.ether.wad.lt(minDeposit.wad)) {
			Logger.debug(`Not enough on-chain eth to deposit: ${balance.onChain.ether.toETH().format()}`);
			return;
		}

		this.setPending({ type: 'deposit', complete: false, closed: false });
		const amount = minBN([balance.onChain.ether.wad.sub(minDeposit.wad), nowMaxDeposit]);
		Logger.log(`Depositing ${amount} wei into channel: ${channel.opts.multisigAddress}`);
		const result = await channel.deposit({ amount: amount.toString() });
		await this.refreshBalances();
		Logger.log(`Successfully deposited ether! Result: ${JSON.stringify(result, null, 2)}`);
		this.setPending({ type: 'deposit', complete: true, closed: false });
		this.autoSwap();
	};

	autoSwap = async () => {
		const { balance, channel, maxDeposit, pending, swapRate, token } = this.state;
		if (!channel) {
			Logger.warn(`Channel not available yet.`);
			return;
		}
		if (balance.channel.ether.wad.eq(Zero)) {
			Logger.debug(`No in-channel eth available to swap`);
			return;
		}
		if (balance.channel.token.wad.gte(maxDeposit.toDAI(swapRate).wad)) {
			return; // swap ceiling has been reached, no need to swap more
		}
		if (!pending.complete) {
			Logger.log(`An operation of type ${pending.type} is pending, waiting to swap`);
			return;
		}

		const maxSwap = tokenToWei(maxDeposit.toDAI().wad.sub(balance.channel.token.wad), swapRate);
		const weiToSwap = minBN([balance.channel.ether.wad, maxSwap]);

		Logger.log(`Attempting to swap ${formatEther(weiToSwap)} eth for dai at rate: ${swapRate}`);
		this.setPending({ type: 'swap', complete: false, closed: false });

		const hubFBAddress = utils.freeBalanceAddressFromXpub(channel.nodePublicIdentifier);
		const collateralNeeded = balance.channel.token.wad.add(weiToToken(weiToSwap, swapRate));
		let collateral = formatEther((await channel.getFreeBalance(token.address))[hubFBAddress]);

		Logger.log(`Collateral: ${collateral} tokens, need: ${formatEther(collateralNeeded)}`);
		if (collateralNeeded.gt(parseEther(collateral))) {
			Logger.log(`Requesting more collateral...`);
			const tokenProfile = await channel.addPaymentProfile({
				amountToCollateralize: collateralNeeded.add(parseEther('10')), // add a buffer of $10 so you dont collateralize on every payment
				minimumMaintainedCollateral: collateralNeeded,
				assetId: token.address
			});
			Logger.log(`Got a new token profile: ${JSON.stringify(tokenProfile)}`);
			this.setState({ tokenProfile });
			await channel.requestCollateral(token.address);
			collateral = formatEther((await channel.getFreeBalance(token.address))[hubFBAddress]);
			Logger.log(`Collateral: ${collateral} tokens, need: ${formatEther(collateralNeeded)}`);
		}
		await channel.swap({
			amount: weiToSwap.toString(),
			fromAssetId: AddressZero,
			swapRate,
			toAssetId: token.address
		});
		await this.refreshBalances();
		this.setPending({ type: 'swap', complete: true, closed: false });

		!this.state.migrating && TransactionsNotificationManager.showInstantPaymentNotification('success_deposit');
	};

	finishMigration = async () => {
		clearTimeout(this.migrationTimeout);
		Logger.log('MIGRATION COMPLETE!!!');
		hub.emit('migration::complete', null);
		this.setState({ migrating: false, migrated: true, pendingDeposits: 0 });
		// End migration
		await AsyncStorage.setItem('@MetaMask:InstaPayVersion', '2.0.0');
	};

	// This forces the modal to close it but won't set the flag
	forceFinishMigration = async () => {
		Logger.log('MIGRATION COMPLETE!!!');
		hub.emit('migration::complete', null);
		this.setState({ migrating: false, migrated: true, pendingDeposits: 0 });
		setTimeout(() => {
			reloadClient();
		}, 1000);
	};

	setPending = pending => {
		this.setState({ pending });
	};

	closeConfirmations = () => {
		const { pending } = this.state;
		this.setState({ pending: { ...pending, closed: true } });
	};

	getBalance = () => this.state.balance.channel.token.toDAI().format({ decimals: 2, symbol: false });

	getAssetId = () => {
		const networkID = Networks[Engine.context.NetworkController.state.provider.type].networkId.toString();
		if (networkID === '1') return AppConstants.DAI_ADDRESS;
		return AppConstants.DAI_ADDRESS_RINKEBY;
	};

	send = async ({ sendAmount, sendRecipient }) =>
		new Promise(async (resolve, reject) => {
			const amount = Currency.DAI(sendAmount);
			const endingTs = Date.now() + 60 * 1000;
			let transferRes = undefined;
			while (Date.now() < endingTs) {
				try {
					const data = {
						assetId: this.getAssetId(),
						amount: amount.wad.toString(),
						conditionType: 'LINKED_TRANSFER_TO_RECIPIENT',
						paymentId: hexlify(randomBytes(32)),
						preImage: hexlify(randomBytes(32)),
						recipient: sendRecipient
					};
					Logger.log('DATA', data);

					transferRes = await this.state.channel.conditionalTransfer(data);
					break;
				} catch (e) {
					Logger.error('ERROR SENDING INSTAPAY', e);
					await delay(5000);
				}
			}
			if (!transferRes) {
				reject('ERROR');
				return;
			}
			resolve();
		});

	deposit = async ({ depositAmount }) => {
		const normalizedTxMeta = {
			from: Engine.context.PreferencesController.state.selectedAddress,
			value: BNToHex(depositAmount),
			to: this.state.wallet.address,
			silent: true
		};

		try {
			const { TransactionController } = Engine.context;
			const signedTx = await TransactionController.addTransaction(normalizedTxMeta);
			const hash = await signedTx.result;

			return new Promise(resolve => {
				TransactionController.hub.on(`${signedTx.transactionMeta.id}:finished`, async () => {
					TransactionController.hub.removeAllListeners(`${signedTx.transactionMeta.id}:finished`);
				});

				TransactionController.hub.on(`${signedTx.transactionMeta.id}:confirmed`, async () => {
					TransactionController.hub.removeAllListeners(`${signedTx.transactionMeta.id}:confirmed`);
					setTimeout(() => {
						!this.state.migrating &&
							TransactionsNotificationManager.showInstantPaymentNotification('pending_deposit');
					}, 1000);
					resolve({
						hash,
						wait: () => Promise.resolve(1)
					});
				});
			});
		} catch (e) {
			Logger.error('ExternalWallet::sign', e);
			throw e;
		}
	};

	withdrawAll = async () => {
		let txHash = null;

		try {
			const { balance, channel, swapRate, token } = this.state;
			const total = balance.channel.total;
			if (total.wad.lte(Zero)) return;
			Logger.log(balance);
			this.setPending({ type: 'withdrawal', complete: false, closed: false });
			TransactionsNotificationManager.showInstantPaymentNotification('pending_withdrawal');
			const selectedAddress = Engine.context.PreferencesController.state.selectedAddress;
			Logger.log(`Withdrawing ${total.toETH().format()} to: ${selectedAddress}`);

			if (balance.channel.token.wad.gt(Zero)) {
				await channel.addPaymentProfile({
					amountToCollateralize: total.toETH().wad.toString(),
					minimumMaintainedCollateral: total.toETH().wad.toString(),
					assetId: AddressZero
				});
				await channel.requestCollateral(AddressZero);
				await channel.swap({
					amount: balance.channel.token.wad.toString(),
					fromAssetId: token.address,
					swapRate: inverse(swapRate),
					toAssetId: AddressZero
				});
				await this.refreshBalances();
			}
			const totalInWei = balance.channel.ether.wad.toString();
			const totalInDAI = Currency.WEI(totalInWei, swapRate)
				.toDAI()
				.wad.toString();
			this.setState({ withdrawalPendingValueInDAI: fromWei(totalInDAI) });

			const result = await channel.withdraw({
				amount: totalInWei,
				assetId: AddressZero,
				recipient: selectedAddress
			});

			Logger.log(`Cashout result: ${JSON.stringify(result)}`);
			txHash = result.transaction.hash;

			this.setPending({ type: 'withdrawal', complete: true, closed: false, txHash });
		} catch (e) {
			Logger.warn('Error while withdrawing...', e);
			this.setPending({ type: 'withdrawal', complete: true, closed: false });
			throw e;
		}

		try {
			// Watch tx until it gets confirmed
			await this.checkForTxConfirmed(txHash);
		} catch (e) {
			Logger.warn('Error while waiting for tx confirmation', txHash);
			throw e;
		}
		try {
			const newInternalTxs = this.handleInternalTransactions(txHash);
			Engine.context.TransactionController.update({ internalTransactions: newInternalTxs });
		} catch (e) {
			Logger.warn('Error while storing the internal tx', txHash);
			throw e;
		}

		this.setState({ withdrawalPendingValueInDAI: undefined });
		TransactionsNotificationManager.showInstantPaymentNotification('success_withdrawal');
	};

	handleInternalTransactions = txHash => {
		const { withdrawalPendingValueInDAI } = this.state;
		const networkID = Networks[Engine.context.NetworkController.state.provider.type].networkId.toString();
		const newInternalTxs = Engine.context.TransactionController.state.internalTransactions || [];
		newInternalTxs.push({
			time: Date.now(),
			status: 'confirmed',
			paymentChannelTransaction: true,
			networkID,
			transaction: {
				from: this.state.channel.opts.multisigAddress,
				to: Engine.context.PreferencesController.state.selectedAddress,
				value: BNToHex(toWei(withdrawalPendingValueInDAI))
			},
			transactionHash: txHash
		});
		return newInternalTxs;
	};

	checkForTxConfirmed = async txHash => {
		const txIsConfirmed = async txHash => {
			const { TransactionController } = Engine.context;
			const txObj = await TransactionController.query('getTransactionByHash', [txHash]);
			if (txObj && txObj.blockNumber) {
				return true;
			}
			return false;
		};

		while (!(await txIsConfirmed(txHash))) {
			await new Promise(res => setTimeout(() => res(), 1000));
		}
		return true;
	};

	logCurrentState = prefix => {
		Logger.log(`${prefix}:error - state dump:`, this.state);
	};

	setUsername = async username => {
		this.setState({ username });
		AsyncStorage.setItem('@MetaMask:InstaPayUsername', username);
		// TBD since there's no nameserver yet
		// await this.state.instaPay3boxSpace.publicSetSpace(`address_${this.state.xpub}`, username);
		// await this.state.instaPay3boxSpace.publicSetSpace(`username_${username}`, this.state.xpub);
		Logger.log('username set to ', username);
	};

	checkForExistingUsername = async xpub => {
		// TBD where to check since there's no nameserver yet
		// const username = await this.state.instaPay3boxSpace.publicGetSpace(`address_${xpub}`);
		const username = null;
		Logger.log(`Instapay check username ${xpub} resolved to `, username);
		if (!this.state.username) {
			this.setState({ username, usernameSynced: true });
			if (username) {
				AsyncStorage.setItem('@MetaMask:InstaPayUsername', username);
			}
		}
	};

	getXpubFromUsername = async username => {
		// TBD where to check since there's no nameserver yet
		// const xpub = await this.state.instaPay3boxSpace.publicGetSpace(`username_${username}`);
		const xpub = null;
		Logger.log(`Instapay check username ${username} resolved to `, xpub);
		return xpub;
	};

	stop = () => {
		running = false;
		if (this.state.channel && this.state.token) {
			try {
				this.state.channel.unsubscribeFromSwapRates &&
					this.state.channel.unsubscribeFromSwapRates(AddressZero, this.state.token.address);
			} catch (e) {
				Logger.log('Error unsubscribing from swaprates', e);
			}
		}
	};
}

instance = {
	/**
	 * Method that initializes the connext client for a
	 * specific address, along with all the listeners required
	 */
	async init() {
		Logger.log('InstaPay :: Init');
		const { provider } = Engine.context.NetworkController.state;
		if (SUPPORTED_NETWORKS.indexOf(provider.type) !== -1) {
			// Uncomment for testing purposes
			// await AsyncStorage.removeItem('@MetaMask:InstaPayRestoreBackUpNeeded');

			const restoreNeeded = await AsyncStorage.getItem('@MetaMask:InstaPayRestoreBackUpNeeded');
			if (restoreNeeded) {
				restoring = true;
				hub.emit('backup::restore', null);
			} else {
				let mnemonic;
				const encryptedMnemonic = await AsyncStorage.getItem('@MetaMask:InstaPayMnemonic');
				if (encryptedMnemonic) {
					try {
						mnemonic = await decryptMnemonic(encryptor, encryptedMnemonic);
						Logger.log('InstaPay :: recovered mnemonic');
					} catch (e) {
						Logger.error('Decrypt mnemonic error', encryptedMnemonic);
					}
				}

				if (!mnemonic) {
					mnemonic = eth.Wallet.createRandom().mnemonic;
					Logger.log('InstaPay :: created new mnemonic');
					await saveMnemonic(encryptor, mnemonic);
				}
				try {
					initListeners();
					Logger.log('InstaPay :: Starting client...');
					client = new InstaPay(mnemonic, provider.type);
				} catch (e) {
					client && client.logCurrentState('InstaPay :: init');
					Logger.error('InstaPay :: init', e);
				}
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
			Logger.log('InstaPay :: stopping client...');
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
			const { swapRate } = client.state;
			if (swapRate) {
				const ETH = parseFloat(swapRate);
				return (MAX_DEPOSIT_TOKEN / ETH).toFixed(2).toString();
			}
		}
		return undefined;
	},
	/**
	 *	Returns the current exchange rate for DAI / ETH
	 */
	getExchangeRate: () => (client && client.state && client.state.swapRate) || 0,
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
	dump: () => (client && client.state) || {},
	getXpub: () => (client && client.state && client.state.xpub.toLowerCase()) || '',
	getDepositAddress: () =>
		(client && client.state && client.state.wallet && toChecksumAddress(client.state.wallet.address)) || '',
	setUsername: username => {
		client && client.setUsername(username);
	},
	syncUsername: () => {
		if (client && !client.state.username) {
			client.checkForExistingUsername(client.state.xpub);
		}
	},
	getXpubFromUsername: username => client && client.getXpubFromUsername(username),
	cleanUp: async () => {
		await AsyncStorage.removeItem('@MetaMask:InstaPayUsername');
		await AsyncStorage.removeItem('@MetaMask:InstaPayMnemonic');
		await AsyncStorage.removeItem('@MetaMask:InstaPay');
		await AsyncStorage.removeItem('@MetaMask:lastKnownInstantPaymentID');
		await AsyncStorage.removeItem('@MetaMask:InstaPayBackedUp');
		await AsyncStorage.removeItem('@MetaMask:InstaPayRestoreBackUpNeeded');
		await AsyncStorage.removeItem('@MetaMask:InstaPayVersion');
		Store.reset();
		instance.stop();
	},
	initBackup: async box => {
		Logger.log('InstaPay :: Backup process initiated');
		const encryptedMnemonic = await AsyncStorage.getItem('@MetaMask:InstaPayMnemonic');
		await backupMnemonic(box, encryptedMnemonic);
		await AsyncStorage.setItem('@MetaMask:InstaPayBackedUp', 'true');
		Logger.log('InstaPay :: Backup process completed');
	},
	restoreBackup: async box => {
		hub.emit('restore::started', null);
		Logger.log('InstaPay :: Restore backup process initiated');
		const backedupEncryptedMnemonic = await getMnemonicFromBackup(box);
		if (backedupEncryptedMnemonic) {
			await AsyncStorage.setItem('@MetaMask:InstaPayMnemonic', backedupEncryptedMnemonic);
			await AsyncStorage.setItem('@MetaMask:InstaPayBackedUp', 'true');
		} else {
			Logger.log('InstaPay :: No backup found!');
			await AsyncStorage.removeItem('@MetaMask:InstaPayBackedUp');
		}
		await AsyncStorage.removeItem('@MetaMask:InstaPayRestoreBackUpNeeded');
		Logger.log('InstaPay :: Restore backup process completed');
		restoring = false;
		hub.emit('restore::complete', null);
		reloadClient();
	},
	reloadClient,
	isRestoring: () => restoring,
	isMigrating: () => client && client.state.migrating,
	requireBackup: () => AsyncStorage.setItem('@MetaMask:InstaPayRestoreBackUpNeeded', 'true')
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
	Engine.context.TransactionController.hub.on('networkChange', () => {
		Logger.log('InstaPay :: Network has changed, reloading client...');
		reloadClient();
	});
	hub.on('payment::confirm', onPaymentConfirm);
}

function removeListeners() {
	Engine.context.TransactionController.hub.removeListener('networkChange', reloadClient);
	hub.removeListener('payment::confirm', onPaymentConfirm);
}

export default instance;
