// eslint-disable-next-line import/no-extraneous-dependencies

import React, { Component } from 'react';
const createInfuraProvider = require('eth-json-rpc-infura/src/createProvider');
import Web3 from 'connext/node_modules/web3/src';

import {
	InteractionManager,
	Platform,
	ScrollView,
	TextInput,
	Alert,
	Text,
	View,
	SafeAreaView,
	StyleSheet,
	ActivityIndicator
} from 'react-native';
import PropTypes from 'prop-types';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { getNavigationOptionsTitle } from '../../UI/Navbar';

// eslint-disable-next-line import/no-namespace
import * as Connext from 'connext';
// eslint-disable-next-line import/no-extraneous-dependencies
import EthContract from 'ethjs-contract';
import EthQuery from 'ethjs-query';

import Engine from '../../../core/Engine';
import { connect } from 'react-redux';
import { hexToBN, renderFromWei, toWei, toBN } from '../../../util/number';
import { setTransactionObject } from '../../../actions/transaction';
import DeviceSize from '../../../util/DeviceSize';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	scrollviewWrapper: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		paddingBottom: 0
	},
	balance: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	balanceText: {
		justifyContent: 'center',
		alignItems: 'center',
		flex: 1,
		marginTop: DeviceSize.isIphoneX() ? 60 : 30,
		fontSize: 80,
		...fontStyles.normal
	},
	info: {
		paddingVertical: 15,
		paddingRight: 20
	},
	data: {
		flex: 1,
		marginTop: 10,
		height: 200
	},
	buttonWrapper: {
		padding: 20,
		alignItems: 'flex-end',
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between'
	},
	button: {
		width: 160,
		height: 40
	},
	fullButton: {
		marginHorizontal: 20,
		marginBottom: 20,
		height: 40
	},
	buttonText: {
		fontSize: 11
	},
	message: {
		marginLeft: 20
	},
	msgKey: {
		fontWeight: 'bold'
	},
	messageText: {
		margin: 5,
		fontSize: 12,
		color: colors.black,
		...fontStyles.normal,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'Roboto'
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 200,
		justifyContent: 'center',
		alignItems: 'center'
	},
	input: {
		width: 160,
		height: 40,
		borderWidth: 1,
		borderColor: colors.borderColor,
		paddingHorizontal: 10
	},
	fullWidthInput: {
		height: 40,
		borderWidth: 1,
		borderColor: colors.borderColor,
		paddingHorizontal: 10,
		marginHorizontal: 20,
		marginTop: 10
	},
	sectionTitleWrapper: {
		paddingHorizontal: 20
	},
	sectionTitleText: {
		...fontStyles.bold
	},
	panel: {
		borderTopWidth: 1,
		borderColor: colors.borderColor,
		paddingTop: 20
	}
});

// eslint-disable-next-line import/no-commonjs
const humanTokenAbi = require('../../../abi/humanToken.json');

const { Big } = Connext.big;
const { CurrencyType, CurrencyConvertable } = Connext.types;
const { getExchangeRates, hasPendingOps } = new Connext.Utils();
// Constants for channel max/min - this is also enforced on the hub
const DEPOSIT_ESTIMATED_GAS = Big('700000'); // 700k gas
const ZERO = Big(0); // 700k gas
const WEI_PER_ETHER = Big(1000000000000000000);
const HUB_EXCHANGE_CEILING = WEI_PER_ETHER.mul(Big(69)); // 69 TST
// const CHANNEL_DEPOSIT_MAX = WEI_PER_ETHER.mul(Big(30)); // 30 TST
const MAX_GAS_PRICE = Big('20000000000'); // 20 gWei

const tokenAbi = humanTokenAbi;

function byteArrayToHex(value) {
	const HexCharacters = '0123456789abcdef';
	const result = [];
	for (let i = 0; i < value.length; i++) {
		const v = value[i];
		result.push(HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f]);
	}
	return '0x' + result.join('');
}

//const HASH_PREAMBLE = 'SpankWallet authentication message:';

class PaymentChannel extends Component {
	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(`Payment channel`, navigation);

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object
	};

	awaitingDeposit = false;

	state = {
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
		address: this.props.selectedAddress.toLowerCase(),
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

	initProviderListeners() {
		Engine.context.TransactionController.hub.on('unapprovedTransaction', transactionMeta => {
			if (this.props.transaction.value || this.props.transaction.to) {
				return;
			}
			const {
				transaction: { value, gas, gasPrice }
			} = transactionMeta;
			transactionMeta.transaction.value = hexToBN(value);
			transactionMeta.transaction.gas = hexToBN(gas);
			transactionMeta.transaction.gasPrice = hexToBN(gasPrice);
			this.props.setTransactionObject({
				...{ symbol: 'ETH', assetType: 'ETH', id: transactionMeta.id },
				...transactionMeta.transaction
			});
			this.props.navigation.push('ApprovalView');
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

		console.log('Setting up connext with opts:', opts);

		// *** Instantiate the connext client ***
		try {
			const connext = await Connext.getConnextClient(opts);

			console.log(`Successfully set up connext! Connext config:`);
			console.log(`  - tokenAddress: ${connext.opts.tokenAddress}`);
			console.log(`  - hubAddress: ${connext.opts.hubAddress}`);
			console.log(`  - contractAddress: ${connext.opts.contractAddress}`);
			console.log(`  - ethNetworkId: ${connext.opts.ethNetworkId}`);
			console.log(`  - public address: ${this.state.address}`);

			this.setState({
				connext,
				tokenAddress: connext.opts.tokenAddress,
				channelManagerAddress: connext.opts.contractAddress,
				hubWalletAddress: connext.opts.hubAddress,
				ethNetworkId: connext.opts.ethNetworkId,
				ethprovider
			});
		} catch (e) {
			console.log('error', e);
		}
	}

	async setTokenContract() {
		try {
			const { tokenAddress, ethprovider } = this.state;

			const contract = new EthContract(ethprovider);
			const tokenContract = contract(tokenAbi).at(tokenAddress);
			this.setState({ tokenContract });
		} catch (e) {
			console.log('Error setting token contract', e);
		}
	}

	componentDidMount = () => {
		InteractionManager.runAfterInteractions(async () => {
			this.initProviderListeners();
			const { provider } = Engine.context.NetworkController.state;

			await this.setConnext(provider);
			await this.setTokenContract();
			await this.pollConnextState();
			await this.setBrowserWalletMinimumBalance();
			await this.pollAndSwap();
		});
		this.mounted = true;
	};

	componentWillUnmount() {
		Engine.context.TransactionController.hub.removeAllListeners();
		this.mounted && this.state.connext.stop();
	}

	async pollConnextState() {
		const { connext } = this.state;
		// register connext listeners
		connext.on('onStateChange', state => {
			console.log('STATE CHANGE!', state);
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

	async poller() {
		await this.autoDeposit();
		await this.autoSwap();

		setInterval(async () => {
			await this.autoDeposit();
		}, 5000);
	}

	pollAndSwap = async () => {
		await this.autoSwap()
		setTimeout(()=>{
			this.pollAndSwap();
		}, 1000);
	}

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
		console.log(`Gas Price = ${providerGasPrice}`);

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

	async autoDeposit() {
		const {
			address,
			tokenContract,
			connextState,
			tokenAddress,
			connext,
			browserMinimumBalance,
			ethprovider
		} = this.state;

		if (!connext || !browserMinimumBalance) return;

		let tokenBalance = Big(ZERO);
		let balance = Big(ZERO);

		const balanceBN = await ethprovider.getBalance(address);
		balance = Big(balanceBN.toString());
		console.log('GOT BALANCE', balance);

		try {
			const tokenBalanceRequest = await tokenContract.balanceOf(address);
			const tokenBalanceBN = tokenBalanceRequest.balance;
			tokenBalance = Big(tokenBalanceBN.toString());
			console.log('GOT TOKEN BALANCE', tokenBalance);
		} catch (e) {
			console.warn(
				`Error fetching token balance, are you sure the token address (addr: ${tokenAddress}) is correct for the selected network (id: ${JSON.stringify(
					await ethprovider.getNetwork()
				)}))? Error: ${e.message}`
			);
			return;
		}
		if (balance.gt(ZERO) || tokenBalance.gt(ZERO)) {
			const minWei = Big(browserMinimumBalance.wei);
			if (balance.lt(minWei)) {
				// don't autodeposit anything under the threshold
				// update the refunding variable before returning
				// We hit this repeatedly after first deposit & we have dust left over
				// No need to clutter logs w the below
				// console.log(`Current balance is ${balance.toString()}, less than minBalance of ${minWei.toString()}`);
				return;
			}
			// only proceed with deposit request if you can deposit
			if (!connextState) {
				return;
			}
			if (
				// something was submitted
				connextState.runtime.deposit.submitted ||
				connextState.runtime.withdrawal.submitted ||
				connextState.runtime.collateral.submitted
			) {
				console.log(`Deposit or withdrawal transaction in progress, will not auto-deposit`);
				return;
			}

			const channelDeposit = {
				amountWei: balance.sub(minWei),
				amountToken: tokenBalance
			};

			if (channelDeposit.amountWei.eq(ZERO) && channelDeposit.amountToken.eq(ZERO)) {
				return;
			}

			await this.state.connext.deposit({
				amountWei: channelDeposit.amountWei.toString(),
				amountToken: channelDeposit.amountToken.toString()
			});
		}
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
			if(hubTokenBalance.gt(weiBalance)){
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
			console.log(`Hub Sync results: ${JSON.stringify(runtime.syncResultsFromHub[0], null, 2)}`);
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
			console.log(`New channel status! ${JSON.stringify(newStatus)}`);
		}
		this.setState({ status: newStatus });
	}

	deposit = async () => {
		if (isNaN(this.state.depositAmount)) {
			return;
		}

		const depositAmount = parseFloat(this.state.depositAmount);
		const maxDepositAmount = 0.12;
		const minDepositAmount = 0.03;
		if (depositAmount > maxDepositAmount) {
			Alert.alert('The max. deposit allowed for now it is 0.12 ETH. Try with a lower amount');
			return;
		}

		if (depositAmount > minDepositAmount) {
			Alert.alert('The max. deposit allowed for now it is 0.03 ETH. Try with a lower amount');
			return;
		}

		try {
			const connext = this.state.connext;
			const params = {
				amountWei: toWei(this.state.depositAmount).toString(),
				amountToken: '0'
			};
			console.log('About to deposit', params);
			await connext.deposit(params);
			this.setState({ depositAmount: '' });
			console.log('Deposit succesful');
			this.awaitingDeposit = true;
		} catch (e) {
			console.log('Deposit error', e);
		}
	};

	sendDAI = async () => {
		if (isNaN(this.state.sendAmount)) {
			return;
		}

		if (!this.state.sendRecipient) {
			return;
		}

		const amount = toWei(this.state.sendAmount).toString();
		const maxAmount = this.state.channelState.balanceTokenUser;

		if (toBN(amount).gt(toBN(maxAmount))) {
			Alert.alert('Insufficient balance');
			return;
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
						amountToken: toWei(this.state.sendAmount).toString(),
					}
				]
			};
			console.log('Sending ', params);
			await connext.buy(params);
			console.log('Send succesful');
		} catch (e) {
			console.log('buy error error', e);
		}
	};

	swapToDAI = async amount => {
		try {
			const connext = this.state.connext;
			console.log('swapping eth to dai');
			await connext.exchange(amount, 'wei');
			console.log('Swap to DAI succesful');
		} catch (e) {
			console.log('buy error error', e);
		}
	};

	swapToETH = async () => {
		try {
			const connext = this.state.connext;
			console.log('swapping DAI  to ETH');
			await connext.exchange(this.state.channelState.balanceTokenUser, 'token');
			console.log('Swap to ETH succesful');
		} catch (e) {
			console.log('buy error error', e);
		}
	};

	withdraw = async () => {
		try {
			const connext = this.state.connext;
			const withdrawalVal = {
				exchangeRate: this.state.runtime.exchangeRate.rates.USD,
				withdrawalWeiUser: this.state.channelState.balanceWeiUser,
				tokensToSell: this.state.channelState.balanceTokenUser,
				withdrawalTokenUser: '0',
				weiToSell: '0',
				recipient: this.props.selectedAddress.toLowerCase()
			};

			await connext.withdraw(withdrawalVal);
			console.log('withdraw succesful');
		} catch (e) {
			console.log('withdraw error', e);
		}
	};

	renderData = obj =>
		obj &&
		Object.keys(obj).map(key => (
			<View style={styles.message} key={key}>
				{typeof obj[key] === 'object' ? (
					<View>
						<Text style={[styles.messageText, styles.msgKey]}>{key}:</Text>
						<View>{this.renderData(obj[key])}</View>
					</View>
				) : (
					<Text style={styles.messageText}>
						<Text style={styles.msgKey}>{key}:</Text> {JSON.stringify(obj[key])}
					</Text>
				)}
			</View>
		));

	renderInfo() {
		if (this.state.channelState) {
			return (
				<View style={styles.info}>
					{/* <View style={styles.row}>
						<Text style={styles.subtitle}>
							STATUS: {this.state.authorized ? <Text style={styles.auth}>Authorized</Text> : null}{' '}
						</Text>
					</View> */}
					{/* <View style={styles.row}>
						<Text style={styles.subtitle}>ONCHAIN TX: {this.state.channelState.txCountChain}</Text>
						<Text style={styles.subtitle}>GLOBAL TX: {this.state.channelState.txCountGlobal}</Text>
					</View> */}

					{/* <View style={styles.row}>
						<Text style={styles.subtitle}>
							ETH BALANCE: {renderFromWei(this.state.channelState.balanceWeiUser, 18)} ETH
						</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.subtitle}>
							TOKEN BALANCE: {renderFromWei(this.state.channelState.balanceTokenUser, 18)} DAI
						</Text>
					</View> */}
					<View style={styles.balance}>
						<Text style={styles.balanceText}>
							$ {this.renderBalance(this.state.channelState.balanceTokenUser)}
						</Text>
					</View>
				</View>
			);
		}

		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	renderBalance(amount) {
		const ret = parseFloat(renderFromWei(amount, 18));
		if (ret === 0) {
			return '0.00';
		}
		return ret.toFixed(2).toString();
	}

	render() {
		return (
			<SafeAreaView style={styles.mainWrapper}>
				<ScrollView
					contentContainerStyle={styles.scrollviewWrapper}
					style={styles.mainWrapper}
					testID={'account-backup-step-1-screen'}
				>
					<View style={styles.wrapper} testID={'test'}>
						<View style={styles.data}>
							<ScrollableTabView>
								<ScrollView tabLabel={'INFO'}>{this.renderInfo()}</ScrollView>
								<ScrollView tabLabel={'PERSISTENT'}>
									{this.renderData(this.state.channelState)}
								</ScrollView>
								<ScrollView tabLabel={'RUNTIME'}>{this.renderData(this.state.runtime)}</ScrollView>
							</ScrollableTabView>
						</View>

						<View style={styles.panel}>
							<View style={styles.sectionTitleWrapper}>
								<Text style={styles.sectionTitleText}>DEPOSIT ETH</Text>
							</View>
							<View style={styles.buttonWrapper}>
								<TextInput
									autoCapitalize="none"
									autoCorrect={false}
									// eslint-disable-next-line react/jsx-no-bind
									onChangeText={val => this.setState({ depositAmount: val })}
									placeholder={`Enter ETH amount`}
									spellCheck={false}
									style={styles.input}
									value={this.state.depositAmount}
									onBlur={this.onBlur}
								/>
								<StyledButton
									containerStyle={styles.button}
									style={styles.buttonText}
									type={'confirm'}
									onPress={this.deposit}
									testID={'submit-button'}
									// disabled={!this.state.runtime.canDeposit}
								>
									DEPOSIT
								</StyledButton>
							</View>
							<View style={styles.sectionTitleWrapper}>
								<Text style={styles.sectionTitleText}>SEND TOKENS</Text>
							</View>
							<TextInput
								autoCapitalize="none"
								autoCorrect={false}
								// eslint-disable-next-line react/jsx-no-bind
								onChangeText={val => this.setState({ sendRecipient: val })}
								placeholder={`Enter recipient: 0x...`}
								spellCheck={false}
								style={styles.fullWidthInput}
								value={this.state.sendRecipient}
								onBlur={this.onBlur}
							/>
							<View style={styles.buttonWrapper}>
								<TextInput
									autoCapitalize="none"
									autoCorrect={false}
									// eslint-disable-next-line react/jsx-no-bind
									onChangeText={val => this.setState({ sendAmount: val })}
									placeholder={`Enter DAI amount`}
									spellCheck={false}
									style={styles.input}
									value={this.state.sendAmount}
									onBlur={this.onBlur}
								/>
								<StyledButton
									containerStyle={styles.button}
									style={styles.buttonText}
									type={'confirm'}
									onPress={this.sendDAI}
									testID={'submit-button'}
									// disabled={!this.state.runtime.canBuy}
								>
									SEND DAI
								</StyledButton>
							</View>
							<StyledButton
								containerStyle={styles.fullButton}
								style={styles.buttonText}
								type={'confirm'}
								onPress={this.withdraw}
								testID={'submit-button'}
								// disabled={!this.state.runtime.canWithdraw}
							>
								CASH OUT
							</StyledButton>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: asset => dispatch(setTransactionObject(asset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PaymentChannel);
