// eslint-disable-next-line import/no-extraneous-dependencies

import React, { Component } from 'react';
// eslint-disable-next-line import/no-commonjs
const createInfuraProvider = require('eth-json-rpc-infura/src/createProvider');
import Icon from 'react-native-vector-icons/FontAwesome';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';

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
	ActivityIndicator,
	TouchableOpacity,
	Dimensions,
	Clipboard
} from 'react-native';
import PropTypes from 'prop-types';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import QRCode from 'react-native-qrcode-svg';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';

// eslint-disable-next-line import/no-namespace
import * as Connext from 'connext';
// eslint-disable-next-line import/no-extraneous-dependencies
import EthContract from 'ethjs-contract';
import EthQuery from 'ethjs-query';

import Engine from '../../../core/Engine';
import { connect } from 'react-redux';
import { renderFromWei, toWei, toBN } from '../../../util/number';
import { setTransactionObject } from '../../../actions/transaction';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import { hideMessage } from 'react-native-flash-message';
import Logger from '../../../util/Logger';

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
		marginTop: 10,
		fontSize: 70,
		...fontStyles.normal
	},
	info: {
		flex: 1,
		paddingVertical: 15,
		paddingRight: 20
	},
	data: {
		marginTop: 10,
		height: 120
	},
	buttonWrapper: {
		paddingVertical: 20,
		alignItems: 'flex-end',
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between'
	},
	noPaddingTop: {
		paddingTop: 0
	},
	button: {
		flex: 0,
		paddingVertical: 5,
		width: 160,
		height: 30
	},
	fullButton: {
		flex: 1,
		marginBottom: 20,
		height: 30
	},
	buttonText: {
		fontSize: 14
	},
	minLoader: {
		minHeight: 70,
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		minHeight: 120,
		justifyContent: 'center',
		alignItems: 'center'
	},
	input: {
		width: 160,
		height: 50,
		borderWidth: 1,
		borderColor: colors.grey200,
		paddingHorizontal: 10
	},
	fullWidthInput: {
		flex: 1,
		height: 50,
		borderWidth: 1,
		borderColor: colors.grey200,
		paddingHorizontal: 10,
		paddingRight: 50,
		marginTop: 10
	},
	sectionTitleText: {
		fontSize: 20,
		...fontStyles.bold
	},
	sectionTitleWrapper: {
		marginBottom: 15
	},
	panel: {
		flex: 1
	},
	panelContent: {
		paddingVertical: 20,
		paddingHorizontal: 20
	},
	accountWrapper: {
		flexDirection: 'row'
	},
	qrCodeButton: {
		position: 'absolute',
		right: 5,
		top: 10,
		minHeight: 50,
		paddingRight: 8,
		paddingLeft: 12,
		flexDirection: 'row',
		alignItems: 'center'
	},
	qrCodeWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 0,
		padding: 15
	},
	addressWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingVertical: 15,
		marginTop: 10,
		borderRadius: 5,
		backgroundColor: colors.grey000
	},
	address: {
		...fontStyles.normal,
		fontSize: Platform.OS === 'ios' ? 14 : 20,
		textAlign: 'center'
	},
	explainerText: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 16,
		marginBottom: 15
	},
	explainerTextWrapper: {
		marginBottom: 20
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue
	},
	tabStyle: {
		paddingBottom: 0
	},
	tabTextStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	},
	bold: {
		...fontStyles.bold
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
//const CHANNEL_DEPOSIT_MAX = WEI_PER_ETHER.mul(Big(30)); // 30 TST
const MAX_GAS_PRICE = Big('20000000000'); // 20 gWei
const MIN_DEPOSIT_ETH = 0.03;
const MAX_DEPOSIT_TOKEN = 30;
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
	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(`Instant Payments`, navigation);

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
		/* Triggers global alert
		*/
		showAlert: PropTypes.func
	};

	awaitingDeposit = false;
	awaitingWithdrawal = false;
	tabView = React.createRef();

	state = {
		loadingConnext: true,
		qrModalVisible: false,
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

	componentDidMount = () => {
		InteractionManager.runAfterInteractions(async () => {
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
		this.mounted && this.state.connext.stop();
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

	async poller() {
		await this.autoDeposit();
		await this.autoSwap();

		setInterval(async () => {
			await this.autoDeposit();
		}, 5000);
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
		Logger.log('GOT BALANCE', balance);

		try {
			const tokenBalanceRequest = await tokenContract.balanceOf(address);
			const tokenBalanceBN = tokenBalanceRequest.balance;
			tokenBalance = Big(tokenBalanceBN.toString());
			Logger.log('GOT TOKEN BALANCE', tokenBalance);
		} catch (e) {
			Logger.log(
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
				// Logger.log(`Current balance is ${balance.toString()}, less than minBalance of ${minWei.toString()}`);
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
				Logger.log(`Deposit or withdrawal transaction in progress, will not auto-deposit`);
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
			Alert.alert('The max. deposit allowed for now it is 0.12 ETH. Try with a lower amount');
			return;
		}

		if (depositAmount < minDepositAmount) {
			Alert.alert('The max. deposit allowed for now it is 0.03 ETH. Try with a lower amount');
			return;
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

	sendDAI = async () => {
		if (isNaN(this.state.sendAmount) || this.state.sendAmount.trim() === '') {
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
			Logger.log('withdraw succesful');
		} catch (e) {
			Logger.log('withdraw error', e);
		}
	};

	renderInfo() {
		return (
			<View style={styles.info}>
				<View style={styles.balance}>
					<Text style={styles.balanceText}>
						$ {this.renderBalance(this.state.channelState.balanceTokenUser)}
					</Text>
				</View>
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

	scan = () => {
		this.props.navigation.navigate('QRScanner', {
			onScanSuccess: meta => {
				if (meta.target_address) {
					this.setState({ sendRecipient: meta.target_address });
				}
			}
		});
	};

	/**
	 * Closes QR code modal
	 */
	closeQrModal = () => {
		this.setState({ qrModalVisible: false });
	};

	/**
	 * Opens QR code modal
	 */
	openQrModal = () => {
		this.setState({ qrModalVisible: true });
	};

	areButtonsDisabled = () => {
		if (this.state.status && this.state.status.type) {
			return this.state.status.type.indexOf('_PENDING') !== -1;
		}
		return false;
	};

	getMinimumDepositFiat() {
		if (this.state.runtime && this.state.runtime.exchangeRate && this.state.runtime.exchangeRate.rates) {
			const ETH = parseFloat(this.state.runtime.exchangeRate.rates.USD);
			return (ETH * MIN_DEPOSIT_ETH).toFixed(2).toString();
		}
		return '0.00';
	}

	getMaximiumDepositEth() {
		if (this.state.runtime && this.state.runtime.exchangeRate && this.state.runtime.exchangeRate.rates) {
			const ETH = parseFloat(this.state.runtime.exchangeRate.rates.USD);
			return (MAX_DEPOSIT_TOKEN / ETH).toFixed(2).toString();
		}
		return '0.00';
	}

	renderMinimumsOrSpinner() {
		if (!this.state.runtime || !this.state.runtime.exchangeRate || !this.state.runtime.exchangeRate.rates) {
			return (
				<View style={styles.minLoader}>
					<ActivityIndicator size="small" />
				</View>
			);
		}

		return (
			<React.Fragment>
				<Text style={styles.explainerText}>
					Min. deposit:{' '}
					<Text style={styles.bold}>
						{MIN_DEPOSIT_ETH} ETH (${this.getMinimumDepositFiat()})
					</Text>
				</Text>
				<Text style={styles.explainerText}>
					Max. deposit:{' '}
					<Text style={styles.bold}>
						{this.getMaximiumDepositEth()} ETH (${MAX_DEPOSIT_TOKEN.toFixed(2).toString()})
					</Text>
				</Text>
			</React.Fragment>
		);
	}

	renderDeposit() {
		const isDisabled = this.areButtonsDisabled();
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>
						In order to start sending instant payments,{' '}
						<Text style={styles.bold}>you first need to deposit some ETH</Text>
					</Text>
					{this.renderMinimumsOrSpinner()}
				</View>

				<View style={styles.sectionTitleWrapper}>
					<Text style={styles.sectionTitleText}>DEPOSIT ETH</Text>
				</View>
				<View style={[styles.buttonWrapper, styles.noPaddingTop]}>
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
						keyboardType="numeric"
						numberOfLines={1}
					/>
					<StyledButton
						containerStyle={styles.button}
						style={styles.buttonText}
						type={'confirm'}
						onPress={this.deposit}
						testID={'submit-button'}
						disabled={isDisabled}
					>
						DEPOSIT
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderSend() {
		const isDisabled = this.areButtonsDisabled();
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>
						Send instant payments completely free to any other Ethereum address!
					</Text>
				</View>
				<View style={styles.sectionTitleWrapper}>
					<Text style={styles.sectionTitleText}>SEND PAYMENT</Text>
				</View>
				<View style={styles.accountWrapper}>
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
					<TouchableOpacity onPress={this.scan} style={styles.qrCodeButton}>
						<Icon name="qrcode" size={Platform.OS === 'android' ? 28 : 28} />
					</TouchableOpacity>
				</View>
				<View style={styles.buttonWrapper}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						// eslint-disable-next-line react/jsx-no-bind
						onChangeText={val => this.setState({ sendAmount: val })}
						placeholder={`Enter Amount`}
						spellCheck={false}
						style={styles.input}
						value={this.state.sendAmount}
						onBlur={this.onBlur}
						keyboardType="numeric"
						numberOfLines={1}
					/>

					<StyledButton
						containerStyle={styles.button}
						style={styles.buttonText}
						type={'confirm'}
						onPress={this.sendDAI}
						testID={'submit-button'}
						disabled={isDisabled}
					>
						SEND
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderReceive() {
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>
						Receive payments by sharing your address or showing your QR code
					</Text>
				</View>
				<View style={styles.qrCodeWrapper}>
					<QRCode
						value={`ethereum:${this.props.selectedAddress}`}
						size={Dimensions.get('window').width - 160}
					/>
				</View>
				<TouchableOpacity style={styles.addressWrapper} onPress={this.copyAccountToClipboard}>
					<Text style={styles.address}>{this.props.selectedAddress}</Text>
				</TouchableOpacity>
			</React.Fragment>
		);
	}

	renderWithdraw() {
		const isDisabled = this.areButtonsDisabled();
		return (
			<React.Fragment>
				<View style={styles.explainerTextWrapper}>
					<Text style={styles.explainerText}>Your funds will be sent to your normal Ethereum account</Text>
					<Text
						style={styles.explainerText}
					>{`This process will take a few seconds because it's a normal ETH transaction`}</Text>
					<Text style={styles.explainerText}>NOTE: The transaction fees will be paid with your funds</Text>
				</View>
				<View style={[styles.buttonWrapper, styles.noPaddingTop]}>
					<StyledButton
						containerStyle={styles.fullButton}
						style={styles.buttonText}
						type={'confirm'}
						onPress={this.withdraw}
						testID={'submit-button'}
						disabled={isDisabled}
					>
						WITHDRAW
					</StyledButton>
				</View>
			</React.Fragment>
		);
	}

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.blue}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.tabTextStyle}
			/>
		);
	}

	copyAccountToClipboard = async () => {
		const { selectedAddress } = this.props;
		await Clipboard.setString(selectedAddress);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('account_details.account_copied_to_clipboard') }
		});
	};

	renderContent() {
		if (!this.state.channelState) {
			return (
				<View style={styles.loader}>
					<ActivityIndicator size="small" />
				</View>
			);
		}

		return (
			<React.Fragment>
				<View style={styles.data}>{this.renderInfo()}</View>
				<View style={styles.panel}>
					<ScrollableTabView renderTabBar={this.renderTabBar} ref={this.tabView}>
						<ScrollView tabLabel={'DEPOSIT'}>
							<View style={styles.panelContent}>{this.renderDeposit()}</View>
						</ScrollView>
						<ScrollView tabLabel={'SEND'}>
							<View style={styles.panelContent}>{this.renderSend()}</View>
						</ScrollView>
						<ScrollView tabLabel={'RECEIVE'}>
							<View style={styles.panelContent}>{this.renderReceive()}</View>
						</ScrollView>
						<ScrollView tabLabel={'WITHDRAW'}>
							<View style={styles.panelContent}>{this.renderWithdraw()}</View>
						</ScrollView>
					</ScrollableTabView>
				</View>
			</React.Fragment>
		);
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
						{this.renderContent()}
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
	setTransactionObject: asset => dispatch(setTransactionObject(asset)),
	showAlert: config => dispatch(showAlert(config))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PaymentChannel);
