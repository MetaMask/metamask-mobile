import React, { Component } from 'react';
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
import { getConnextClient } from 'connext/dist/Connext';
import Engine from '../../../core/Engine';
import Web3 from 'connext/node_modules/web3/src';
import { connect } from 'react-redux';
import { hexToBN, renderFromWei, toWei, toBN } from '../../../util/number';
import { setTransactionObject } from '../../../actions/transaction';
import Logger from '../../../util/Logger';
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
	subtitle: {
		fontSize: 14,
		marginLeft: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		...fontStyles.normal
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10
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

const HASH_PREAMBLE = 'SpankWallet authentication message:';

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
		web3: new Web3(Engine.context.NetworkController.provider),
		hubUrl: `https://daicard.io/api/rinkeby/hub`,
		connext: null,
		tokenAddress: null,
		channelManagerAddress: null,
		hubWalletAddress: null,
		ethNetworkId: null,
		authorized: false,
		user: this.props.selectedAddress.toLowerCase(),
		channelState: null,
		connextState: null,
		persistent: null,
		runtime: { canBuy: false, canDeposit: false, canWithdraw: false },
		exchangeRate: 0,
		sendAmount: '',
		sendRecipient: '',
		depositAmount: ''
	};

	metamaskSign = async (hash, user) => {
		const { KeyringController } = Engine.context;
		return KeyringController.signPersonalMessage({ data: hash, from: user });
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

	initClient = async () => {
		const opts = {
			web3: this.state.web3,
			hubUrl: this.state.hubUrl, //url of hub,
			user: this.state.user
		};

		Logger.log('Setting up connext with opts:', opts);

		// *** Instantiate the connext client ***
		try {
			const connext = await getConnextClient(opts);
			connext.sign = this.metamaskSign.bind(this);

			Logger.log(`Successfully set up connext! Connext config:`);
			Logger.log(`  - tokenAddress: ${connext.opts.tokenAddress}`);
			Logger.log(`  - hubAddress: ${connext.opts.hubAddress}`);
			Logger.log(`  - contractAddress: ${connext.opts.contractAddress}`);
			Logger.log(`  - ethNetworkId: ${connext.opts.ethNetworkId}`);

			this.setState({
				connext,
				tokenAddress: connext.opts.tokenAddress,
				channelManagerAddress: connext.opts.contractAddress,
				hubWalletAddress: connext.opts.hubAddress,
				ethNetworkId: connext.opts.ethNetworkId
			});
		} catch (e) {
			Logger.log('error', e);
		}
	};

	async authorizeHandler() {
		const { hubUrl, web3 } = this.state;
		let challengeRes;
		let signature;

		try {
			// 1 - Challenge
			const challengeResponse = await fetch(`${hubUrl}/auth/challenge`, {
				method: 'POST',
				credentials: 'include'
			});
			challengeRes = await challengeResponse.json();
		} catch (e) {
			Logger.log('challenge failed', e);
			return false;
		}

		try {
			const { KeyringController } = Engine.context;
			const hash = web3.utils.sha3(
				`${HASH_PREAMBLE} ${web3.utils.sha3(challengeRes.nonce)} ${web3.utils.sha3('localhost')}`
			);
			signature = await KeyringController.signPersonalMessage({
				data: hash,
				from: this.props.selectedAddress.toLowerCase()
			});
		} catch (e) {
			Logger.log('signing failed', e);
			return false;
		}

		try {
			// 2 - Response
			const authResponse = await fetch(`${hubUrl}/auth/response`, {
				method: 'POST',
				credentials: 'include',
				body: JSON.stringify({
					nonce: challengeRes.nonce,
					address: this.props.selectedAddress.toLowerCase(),
					origin: 'localhost',
					signature
				}),
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					Authorization: 'Bearer foo'
				}
			});

			const authRes = await authResponse.json();
			const token = authRes.token;
			//document.cookie = `hub.sid=${token}`;
			Logger.log(`hub authentication cookie set: ${token}`);
		} catch (e) {
			Logger.log('response failed', e);
			return false;
		}

		try {
			// 3 - Confirm status
			const res = await fetch(`${hubUrl}/auth/status`, {
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					Authorization: 'Bearer foo'
				},
				credentials: 'include'
			});

			const restStatus = await res.json();

			if (restStatus.success) {
				this.setState({ authorized: true });
				return restStatus.success;
			}

			this.setState({ authorized: false });
			Logger.log(`Auth status: ${JSON.stringify(restStatus)}`);
		} catch (e) {
			Logger.log('status failed', e);
			return false;
		}
	}

	componentDidMount = () => {
		InteractionManager.runAfterInteractions(async () => {
			this.initProviderListeners();
			await this.authorizeHandler();
			await this.initClient();
			this.pollConnextState();
		});
		this.mounted = true;
	};

	componentWillUnmount() {
		Engine.context.TransactionController.hub.removeAllListeners();
		this.mounted && this.state.connext.stop();
	}

	async pollConnextState() {
		// Get connext object
		const connext = this.state.connext;

		// Register listeners
		connext.on('onStateChange', state => {
			if (
				this.awaitingDeposit &&
				this.state.channelState.balanceWeiUser === '0' &&
				state.persistent.channel.balanceWeiUser !== '0'
			) {
				this.awaitingDeposit = false;
				this.swapToDAI(state.persistent.channel.balanceWeiUser);
			}

			Logger.log('Connext state changed:', state);
			this.setState({
				channelState: state.persistent.channel,
				connextState: state,
				runtime: state.runtime,
				persistent: state.persistent,
				exchangeRate: state.runtime.exchangeRate ? state.runtime.exchangeRate.rates.USD : 0
			});
		});

		// start polling
		try {
			await connext.start(fetch);
			Logger.log('Polling started correctly');
			Logger.log('Requesting collateral!');
			await connext.requestCollateral();
			Logger.log('Collateral requested succesfully!');
		} catch (e) {
			Logger.log('polling error', e);
		}
	}

	deposit = async () => {
		if (isNaN(this.state.depositAmount)) {
			return;
		}

		const depositAmount = parseFloat(this.state.depositAmount);
		const maxDepositAmount = 0.24;
		if (depositAmount > maxDepositAmount) {
			Alert.alert('The max. deposit allowed for now it is 0.24 ETH. Try with a lower amount');
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
			this.awaitingDeposit = true;
		} catch (e) {
			Logger.log('Deposit error', e);
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
						amount: {
							amountWei: '0',
							amountToken: toWei(this.state.sendAmount).toString()
						},
						type: 'PT_CHANNEL'
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
					<View style={styles.row}>
						<Text style={styles.subtitle}>ONCHAIN TX: {this.state.channelState.txCountChain}</Text>
						<Text style={styles.subtitle}>GLOBAL TX: {this.state.channelState.txCountGlobal}</Text>
					</View>

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
		const ret = renderFromWei(amount, 18);
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
									{this.renderData(this.state.persistent)}
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
									disabled={!this.state.runtime.canDeposit}
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
									disabled={!this.state.runtime.canBuy}
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
								disabled={!this.state.runtime.canWithdraw}
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
