import React, { PureComponent } from 'react';
import {
	InteractionManager,
	ActivityIndicator,
	AppState,
	StyleSheet,
	View,
	PushNotificationIOS, // eslint-disable-line react-native/split-platform-components
	Alert
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStackNavigator } from 'react-navigation-stack';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import ENS from 'ethjs-ens';
import GlobalAlert from '../../UI/GlobalAlert';
import FlashMessage from 'react-native-flash-message';
import BackgroundTimer from 'react-native-background-timer';
import Browser from '../../Views/Browser';
import AddBookmark from '../../Views/AddBookmark';
import SimpleWebview from '../../Views/SimpleWebview';
import Approval from '../../Views/Approval';
import Settings from '../../Views/Settings';
import GeneralSettings from '../../Views/Settings/GeneralSettings';
import AdvancedSettings from '../../Views/Settings/AdvancedSettings';
import SecuritySettings from '../../Views/Settings/SecuritySettings';
import ExperimentalSettings from '../../Views/Settings/ExperimentalSettings';
import NetworksSettings from '../../Views/Settings/NetworksSettings';
import NetworkSettings from '../../Views/Settings/NetworksSettings/NetworkSettings';
import AppInformation from '../../Views/Settings/AppInformation';
import Contacts from '../../Views/Settings/Contacts';
import Wallet from '../../Views/Wallet';
import TransactionsView from '../../Views/TransactionsView';
import SyncWithExtension from '../../Views/SyncWithExtension';
import Asset from '../../Views/Asset';
import AddAsset from '../../Views/AddAsset';
import Collectible from '../../Views/Collectible';
import CollectibleView from '../../Views/CollectibleView';
import Send from '../../Views/Send';
import SendTo from '../../Views/SendFlow/SendTo';
import RevealPrivateCredential from '../../Views/RevealPrivateCredential';
import WalletConnectSessions from '../../Views/WalletConnectSessions';
import OfflineMode from '../../Views/OfflineMode';
import QrScanner from '../../Views/QRScanner';
import LockScreen from '../../Views/LockScreen';
import ProtectYourAccount from '../../Views/ProtectYourAccount';
import ChoosePasswordSimple from '../../Views/ChoosePasswordSimple';
import EnterPasswordSimple from '../../Views/EnterPasswordSimple';
import ChoosePassword from '../../Views/ChoosePassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep2 from '../../Views/AccountBackupStep2';
import AccountBackupStep3 from '../../Views/AccountBackupStep3';
import AccountBackupStep4 from '../../Views/AccountBackupStep4';
import AccountBackupStep5 from '../../Views/AccountBackupStep5';
import AccountBackupStep6 from '../../Views/AccountBackupStep6';
import ImportPrivateKey from '../../Views/ImportPrivateKey';
import PaymentChannel from '../../Views/PaymentChannel';
import ImportPrivateKeySuccess from '../../Views/ImportPrivateKeySuccess';
import PaymentRequest from '../../UI/PaymentRequest';
import PaymentRequestSuccess from '../../UI/PaymentRequestSuccess';
import { TransactionNotification } from '../../UI/TransactionNotification';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import PushNotification from 'react-native-push-notification';
import I18n, { strings } from '../../../../locales/i18n';
import { colors } from '../../../styles/common';
import LockManager from '../../../core/LockManager';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import { BNToHex, hexToBN, fromWei, renderFromTokenMinimalUnit } from '../../../util/number';
import { setEtherTransaction, setTransactionObject } from '../../../actions/transaction';
import PersonalSign from '../../UI/PersonalSign';
import TypedSign from '../../UI/TypedSign';
import Modal from 'react-native-modal';
import WalletConnect from '../../../core/WalletConnect';
import PaymentChannelsClient from '../../../core/PaymentChannelsClient';
import WalletConnectSessionApproval from '../../UI/WalletConnectSessionApproval';
import PaymentChannelApproval from '../../UI/PaymentChannelApproval';
import PaymentChannelDeposit from '../../Views/PaymentChannel/PaymentChannelDeposit';
import PaymentChannelSend from '../../Views/PaymentChannel/PaymentChannelSend';
import Networks from '../../../util/networks';
import Device from '../../../util/Device';
import {
	CONNEXT_DEPOSIT,
	getMethodData,
	TOKEN_METHOD_TRANSFER,
	decodeTransferData,
	APPROVE_FUNCTION_SIGNATURE
} from '../../../util/transactions';
import { BN, isValidAddress } from 'ethereumjs-util';
import { isENS, safeToChecksumAddress } from '../../../util/address';
import Logger from '../../../util/Logger';
import contractMap from 'eth-contract-metadata';
import MessageSign from '../../UI/MessageSign';
import WalletConnectReturnToBrowserModal from '../../UI/WalletConnectReturnToBrowserModal';
import AsyncStorage from '@react-native-community/async-storage';
import Approve from '../../Views/ApproveView/Approve';
import Amount from '../../Views/SendFlow/Amount';
import Confirm from '../../Views/SendFlow/Confirm';
import ContactForm from '../../Views/Settings/Contacts/ContactForm';
import TransactionTypes from '../../../core/TransactionTypes';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * Navigator component that wraps
 * the 2 main sections: Browser, Wallet
 */
const MainNavigator = createStackNavigator(
	{
		Home: {
			screen: createBottomTabNavigator(
				{
					BrowserTabHome: createStackNavigator({
						BrowserView: {
							screen: Browser,
							navigationOptions: {
								gesturesEnabled: false
							}
						}
					}),
					WalletTabHome: createStackNavigator({
						WalletView: {
							screen: Wallet
						},
						Asset: {
							screen: Asset
						},
						AddAsset: {
							screen: AddAsset
						},
						Collectible: {
							screen: Collectible
						},
						CollectibleView: {
							screen: CollectibleView
						},
						RevealPrivateCredentialView: {
							screen: RevealPrivateCredential
						}
					}),
					TransactionsHome: createStackNavigator({
						TransactionsView: {
							screen: TransactionsView
						}
					}),
					PaymentChannelHome: createStackNavigator({
						PaymentChannelView: {
							screen: PaymentChannel
						},
						PaymentChannelDeposit: {
							screen: PaymentChannelDeposit
						},
						PaymentChannelSend: {
							screen: PaymentChannelSend
						}
					})
				},
				{
					defaultNavigationOptions: () => ({
						tabBarVisible: false
					})
				}
			)
		},
		Webview: {
			screen: createStackNavigator(
				{
					SimpleWebview: {
						screen: SimpleWebview
					}
				},
				{
					mode: 'modal'
				}
			)
		},
		SettingsView: {
			screen: createStackNavigator({
				Settings: {
					screen: Settings
				},
				GeneralSettings: {
					screen: GeneralSettings
				},
				AdvancedSettings: {
					screen: AdvancedSettings
				},
				SecuritySettings: {
					screen: SecuritySettings
				},
				ExperimentalSettings: {
					screen: ExperimentalSettings
				},
				NetworksSettings: {
					screen: NetworksSettings
				},
				NetworkSettings: {
					screen: NetworkSettings
				},
				CompanySettings: {
					screen: AppInformation
				},
				ContactsSettings: {
					screen: Contacts
				},
				ContactForm: {
					screen: ContactForm
				},
				SyncWithExtensionView: {
					screen: SyncWithExtension
				},
				RevealPrivateCredentialView: {
					screen: RevealPrivateCredential
				},
				WalletConnectSessionsView: {
					screen: WalletConnectSessions
				},
				ChoosePasswordSimple: {
					screen: ChoosePasswordSimple
				},
				EnterPasswordSimple: {
					screen: EnterPasswordSimple
				}
			})
		},
		ImportPrivateKeyView: {
			screen: createStackNavigator(
				{
					ImportPrivateKey: {
						screen: ImportPrivateKey
					},
					ImportPrivateKeySuccess: {
						screen: ImportPrivateKeySuccess
					}
				},
				{
					headerMode: 'none'
				}
			)
		},
		SendView: {
			screen: createStackNavigator({
				Send: {
					screen: Send
				}
			})
		},
		SendFlowView: {
			screen: createStackNavigator({
				SendTo: {
					screen: SendTo
				},
				Amount: {
					screen: Amount
				},
				Confirm: {
					screen: Confirm
				}
			})
		},
		ApprovalView: {
			screen: createStackNavigator({
				Approval: {
					screen: Approval
				}
			})
		},
		ApproveView: {
			screen: createStackNavigator({
				Approve: {
					screen: Approve
				}
			})
		},
		AddBookmarkView: {
			screen: createStackNavigator({
				AddBookmark: {
					screen: AddBookmark
				}
			})
		},
		OfflineModeView: {
			screen: createStackNavigator({
				OfflineMode: {
					screen: OfflineMode
				}
			})
		},
		/** ALL FULL SCREEN MODALS SHOULD GO HERE */
		QRScanner: {
			screen: QrScanner
		},
		LockScreen: {
			screen: LockScreen
		},

		PaymentRequestView: {
			screen: createStackNavigator(
				{
					PaymentRequest: {
						screen: PaymentRequest
					},
					PaymentRequestSuccess: {
						screen: PaymentRequestSuccess
					}
				},
				{
					mode: 'modal'
				}
			)
		},
		SetPasswordFlow: {
			screen: createStackNavigator(
				{
					ProtectYourAccount: {
						screen: ProtectYourAccount
					},
					ChoosePassword: {
						screen: ChoosePassword
					},
					AccountBackupStep1: {
						screen: AccountBackupStep1
					},
					AccountBackupStep2: {
						screen: AccountBackupStep2
					},
					AccountBackupStep3: {
						screen: AccountBackupStep3
					},
					AccountBackupStep4: {
						screen: AccountBackupStep4
					},
					AccountBackupStep5: {
						screen: AccountBackupStep5
					},
					AccountBackupStep6: {
						screen: AccountBackupStep6,
						navigationOptions: {
							gesturesEnabled: false
						}
					}
				},
				{
					headerMode: 'none'
				}
			)
		}
	},
	{
		mode: 'modal',
		headerMode: 'none'
	}
);

class Main extends PureComponent {
	static router = {
		...MainNavigator.router
	};
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Time to auto-lock the app after it goes in background mode
		 */
		lockTime: PropTypes.number,
		/**
		 * Flag that determines if payment channels are enabled
		 */
		paymentChannelsEnabled: PropTypes.bool,
		/**
		 * Action that sets an ETH transaction
		 */
		setEtherTransaction: PropTypes.func,
		/**
		 * Action that sets a transaction
		 */
		setTransactionObject: PropTypes.func,
		/**
		 * Selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * List of all tracked tokens
		 */
		allTokens: PropTypes.object,
		/**
		/**
		 * List of all the balances of each contract tracked
		 */
		contractBalances: PropTypes.object,
		/**
		 * List of transactions
		 */
		transactions: PropTypes.array,
		/**
		 * A string representing the network name
		 */
		providerType: PropTypes.string
	};

	state = {
		connected: true,
		forceReload: false,
		signMessage: false,
		signMessageParams: { data: '' },
		signType: '',
		walletConnectRequest: false,
		walletConnectRequestInfo: {},
		walletConnectReturnModalVisible: false,
		paymentChannelRequest: false,
		paymentChannelRequestLoading: false,
		paymentChannelRequestCompleted: false,
		paymentChannelRequestInfo: {}
	};

	backgroundMode = false;
	locale = I18n.locale;

	pollForIncomingTransactions = async () => {
		await Engine.refreshTransactionHistory();
		// Stop polling if the app is in the background
		if (!this.backgroundMode) {
			setTimeout(() => {
				this.pollForIncomingTransactions();
			}, AppConstants.TX_CHECK_NORMAL_FREQUENCY);
		}
	};

	componentDidMount = async () => {
		InteractionManager.runAfterInteractions(() => {
			AppState.addEventListener('change', this.handleAppStateChange);
			this.lockManager = new LockManager(this.props.navigation, this.props.lockTime);
			PushNotification.configure({
				requestPermissions: false,
				onNotification: notification => {
					let data = null;
					if (Device.isAndroid()) {
						if (notification.tag) {
							data = JSON.parse(notification.tag);
						}
					} else if (notification.data) {
						data = notification.data;
					}
					if (data && data.action === 'tx') {
						if (data.id) {
							TransactionsNotificationManager.setTransactionToView(data.id);
						}
						this.props.navigation.navigate('TransactionsHome');
					}

					if (Device.isIos()) {
						notification.finish(PushNotificationIOS.FetchResult.NoData);
					}
				}
			});

			Engine.context.TransactionController.hub.on('unapprovedTransaction', this.onUnapprovedTransaction);

			Engine.context.MessageManager.hub.on('unapprovedMessage', messageParams => {
				const { title: currentPageTitle, url: currentPageUrl } = messageParams.meta;
				delete messageParams.meta;
				this.setState({
					signMessage: true,
					signMessageParams: messageParams,
					signType: 'eth',
					currentPageTitle,
					currentPageUrl
				});
			});

			Engine.context.PersonalMessageManager.hub.on('unapprovedMessage', messageParams => {
				const { title: currentPageTitle, url: currentPageUrl } = messageParams.meta;
				delete messageParams.meta;
				this.setState({
					signMessage: true,
					signMessageParams: messageParams,
					signType: 'personal',
					currentPageTitle,
					currentPageUrl
				});
			});

			Engine.context.TypedMessageManager.hub.on('unapprovedMessage', messageParams => {
				const { title: currentPageTitle, url: currentPageUrl } = messageParams.meta;
				delete messageParams.meta;
				this.setState({
					signMessage: true,
					signMessageParams: messageParams,
					signType: 'typed',
					currentPageTitle,
					currentPageUrl
				});
			});

			setTimeout(() => {
				TransactionsNotificationManager.init(this.props.navigation);
				this.pollForIncomingTransactions();

				this.initializeWalletConnect();

				// Only if enabled under settings
				if (this.props.paymentChannelsEnabled) {
					this.initializePaymentChannels();
				}

				setTimeout(() => {
					this.checkForSai();
				}, 3500);

				this.removeConnectionStatusListener = NetInfo.addEventListener(this.connectionChangeHandler);
			}, 1000);
		});
	};

	checkForSai = async () => {
		let hasSAI = false;
		Object.keys(this.props.allTokens).forEach(account => {
			const tokens = this.props.allTokens[account].mainnet;
			tokens &&
				tokens.forEach(token => {
					if (token.address.toLowerCase() === AppConstants.SAI_ADDRESS.toLowerCase()) {
						if (this.props.contractBalances[AppConstants.SAI_ADDRESS]) {
							const balance = this.props.contractBalances[AppConstants.SAI_ADDRESS];
							if (!balance.isZero()) {
								hasSAI = true;
							}
						}
					}
				});
		});

		if (hasSAI) {
			const previousReminder = await AsyncStorage.getItem('@MetaMask:nextMakerReminder');
			if (!previousReminder || parseInt(previousReminder, 10) < Date.now()) {
				Alert.alert(
					strings('sai_migration.title'),
					strings('sai_migration.message'),
					[
						{
							text: strings('sai_migration.lets_do_it'),
							onPress: async () => {
								this.props.navigation.navigate('BrowserTabHome');
								InteractionManager.runAfterInteractions(() => {
									setTimeout(() => {
										this.props.navigation.navigate('BrowserView', {
											newTabUrl: 'https://migrate.makerdao.com'
										});
										const tsToRemind = Date.now() + AppConstants.SAI_MIGRATION_DAYS_TO_REMIND;
										AsyncStorage.setItem('@MetaMask:nextMakerReminder', tsToRemind.toString());
									}, 300);
								});
							},
							style: 'cancel'
						},
						{
							text: strings('sai_migration.learn_more'),
							onPress: () => {
								this.props.navigation.navigate('BrowserTabHome');
								InteractionManager.runAfterInteractions(() => {
									setTimeout(() => {
										this.props.navigation.navigate('BrowserView', {
											newTabUrl:
												'https://blog.makerdao.com/what-to-expect-with-the-launch-of-multi-collateral-dai/'
										});
										const tsToRemind = Date.now() + AppConstants.SAI_MIGRATION_DAYS_TO_REMIND;
										AsyncStorage.setItem('@MetaMask:nextMakerReminder', tsToRemind.toString());
									}, 300);
								});
							}
						}
					],
					{ cancelable: false }
				);
			}
		}
	};

	connectionChangeHandler = state => {
		// Show the modal once the status changes to offline
		if (this.state.connected && !state.isConnected) {
			this.props.navigation.navigate('OfflineModeView');
		}

		this.setState({ connected: state.isConnected });
	};

	initializeWalletConnect = () => {
		WalletConnect.hub.on('walletconnectSessionRequest', peerInfo => {
			this.setState({ walletConnectRequest: true, walletConnectRequestInfo: peerInfo });
		});
		WalletConnect.hub.on('walletconnect:return', () => {
			this.setState({ walletConnectReturnModalVisible: true });
		});
		WalletConnect.init();
	};

	initializePaymentChannels = () => {
		PaymentChannelsClient.init(this.props.selectedAddress);
		PaymentChannelsClient.hub.on('payment::request', async request => {
			const validRequest = { ...request };
			// Validate amount
			if (isNaN(request.amount)) {
				Alert.alert(
					strings('payment_channel_request.title_error'),
					strings('payment_channel_request.amount_error_message')
				);
				return;
			}

			const isAddress = !request.to || request.to.substring(0, 2).toLowerCase() === '0x';
			const isInvalidAddress = isAddress && !isValidAddress(request.to);

			// Validate address
			if (isInvalidAddress || (!isAddress && !isENS(request.to))) {
				Alert.alert(
					strings('payment_channel_request.title_error'),
					strings('payment_channel_request.address_error_message')
				);
				return;
			}

			// Check if ENS and resolve the address before sending
			if (isENS(request.to)) {
				this.setState(
					{
						paymentChannelRequest: true,
						paymentChannelRequestInfo: null
					},
					() => {
						InteractionManager.runAfterInteractions(async () => {
							const {
								state: { network },
								provider
							} = Engine.context.NetworkController;
							const ensProvider = new ENS({ provider, network });
							try {
								const resolvedAddress = await ensProvider.lookup(request.to.trim());
								if (isValidAddress(resolvedAddress)) {
									validRequest.to = resolvedAddress;
									validRequest.ensName = request.to;
									this.setState({
										paymentChannelRequest: true,
										paymentChannelRequestInfo: validRequest
									});
									return;
								}
							} catch (e) {
								Logger.log('Error with payment request', request);
							}
							Alert.alert(
								strings('payment_channel_request.title_error'),
								strings('payment_channel_request.address_error_message')
							);
							this.setState({
								paymentChannelRequest: false,
								paymentChannelRequestInfo: null
							});
						});
					}
				);
			} else {
				this.setState({
					paymentChannelRequest: true,
					paymentChannelRequestInfo: validRequest
				});
			}
		});

		PaymentChannelsClient.hub.on('payment::complete', () => {
			// show the success screen
			this.setState({ paymentChannelRequestCompleted: true });
			// hide the modal and reset state
			setTimeout(() => {
				this.setState({
					paymentChannelRequest: false,
					paymentChannelRequestLoading: false,
					paymentChannelRequestInfo: {}
				});
				setTimeout(() => {
					this.setState({
						paymentChannelRequestCompleted: false
					});
				}, 1500);
			}, 800);
		});

		PaymentChannelsClient.hub.on('payment::error', error => {
			if (error === 'INVALID_ENS_NAME') {
				Alert.alert(
					strings('payment_channel_request.title_error'),
					strings('payment_channel_request.address_error_message')
				);
			} else if (error.indexOf('insufficient_balance') !== -1) {
				Alert.alert(
					strings('payment_channel_request.error'),
					strings('payment_channel_request.balance_error_message')
				);
			}

			// hide the modal and reset state
			setTimeout(() => {
				setTimeout(() => {
					this.setState({
						paymentChannelRequest: false,
						paymentChannelRequestLoading: false,
						paymentChannelRequestInfo: {}
					});
					setTimeout(() => {
						this.setState({
							paymentChannelRequestCompleted: false
						});
					});
				}, 800);
			}, 800);
		});
	};

	paymentChannelDepositSign = async transactionMeta => {
		const { TransactionController } = Engine.context;
		const { transactions } = this.props;
		try {
			TransactionController.hub.once(`${transactionMeta.id}:finished`, transactionMeta => {
				if (transactionMeta.status === 'submitted') {
					this.setState({ transactionHandled: true });
					this.props.navigation.pop();
					TransactionsNotificationManager.watchSubmittedTransaction({
						...transactionMeta,
						assetType: transactionMeta.transaction.assetType
					});
				} else {
					throw transactionMeta.error;
				}
			});

			const fullTx = transactions.find(({ id }) => id === transactionMeta.id);
			const gasPrice = BNToHex(
				hexToBN(transactionMeta.transaction.gasPrice)
					.mul(new BN(AppConstants.INSTAPAY_GAS_PONDERATOR * 10))
					.div(new BN(10))
			);
			const updatedTx = { ...fullTx, transaction: { ...transactionMeta.transaction, gasPrice } };
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transactionMeta.id);
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [
				{ text: strings('navigation.ok') }
			]);
			this.setState({ transactionHandled: false });
		}
	};

	onUnapprovedTransaction = async transactionMeta => {
		if (transactionMeta.origin === TransactionTypes.MMM) return;
		// Check if it's a payment channel deposit transaction to sign
		const to = safeToChecksumAddress(transactionMeta.transaction.to);
		const networkId = Networks[this.props.providerType].networkId;
		if (
			this.props.paymentChannelsEnabled &&
			AppConstants.CONNEXT.SUPPORTED_NETWORKS.includes(this.props.providerType) &&
			transactionMeta.transaction.data &&
			transactionMeta.transaction.data.substr(0, 10) === CONNEXT_DEPOSIT &&
			to === AppConstants.CONNEXT.CONTRACTS[networkId]
		) {
			await this.paymentChannelDepositSign(transactionMeta);
		} else {
			const {
				transaction: { value, gas, gasPrice, data }
			} = transactionMeta;
			const { AssetsContractController } = Engine.context;
			transactionMeta.transaction.gas = hexToBN(gas);
			transactionMeta.transaction.gasPrice = hexToBN(gasPrice);

			if (
				(value === '0x0' || !value) &&
				data &&
				data !== '0x' &&
				to &&
				(await getMethodData(data)).name === TOKEN_METHOD_TRANSFER
			) {
				let asset = this.props.tokens.find(({ address }) => address === to);
				if (!asset && contractMap[to]) {
					asset = contractMap[to];
				} else if (!asset) {
					try {
						asset = {};
						asset.decimals = await AssetsContractController.getTokenDecimals(to);
						asset.symbol = await AssetsContractController.getAssetSymbol(to);
					} catch (e) {
						// This could fail when requesting a transfer in other network
						asset = { symbol: 'ERC20', decimals: new BN(0) };
					}
				}

				const decodedData = decodeTransferData('transfer', data);
				transactionMeta.transaction.value = hexToBN(decodedData[2]);
				transactionMeta.transaction.readableValue = renderFromTokenMinimalUnit(
					hexToBN(decodedData[2]),
					asset.decimals
				);
				transactionMeta.transaction.to = decodedData[0];

				this.props.setTransactionObject({
					type: 'INDIVIDUAL_TOKEN_TRANSACTION',
					selectedAsset: asset,
					id: transactionMeta.id,
					origin: transactionMeta.origin,
					...transactionMeta.transaction
				});
			} else {
				transactionMeta.transaction.value = hexToBN(value);
				transactionMeta.transaction.readableValue = fromWei(transactionMeta.transaction.value);

				this.props.setEtherTransaction({
					id: transactionMeta.id,
					origin: transactionMeta.origin,
					...transactionMeta.transaction
				});
			}

			if (data && data.substr(0, 10) === APPROVE_FUNCTION_SIGNATURE) {
				this.props.navigation.push('ApproveView');
			} else {
				this.props.navigation.push('ApprovalView');
			}
		}
	};

	handleAppStateChange = appState => {
		const newModeIsBackground = appState === 'background';
		// If it was in background and it's not anymore
		// we need to stop the Background timer
		if (this.backgroundMode && !newModeIsBackground) {
			BackgroundTimer.stop();
			this.pollForIncomingTransactions();
		}

		this.backgroundMode = newModeIsBackground;

		// If the app is now in background, we need to start
		// the background timer, which is less intense
		if (this.backgroundMode) {
			this.setState({ walletConnectReturnModalVisible: false });
			BackgroundTimer.runBackgroundTimer(async () => {
				await Engine.refreshTransactionHistory();
			}, AppConstants.TX_CHECK_BACKGROUND_FREQUENCY);
		}
	};

	componentDidUpdate(prevProps) {
		if (this.locale !== I18n.locale) {
			this.locale = I18n.locale;
			this.forceReload();
			return;
		}
		if (this.props.lockTime !== prevProps.lockTime) {
			this.lockManager.updateLockTime(this.props.lockTime);
		}
		if (this.props.paymentChannelsEnabled !== prevProps.paymentChannelsEnabled) {
			if (this.props.paymentChannelsEnabled) {
				this.initializePaymentChannels();
			} else {
				PaymentChannelsClient.stop();
			}
		}
	}

	forceReload() {
		// Force unmount the webview to avoid caching problems
		this.setState({ forceReload: true }, () => {
			setTimeout(() => {
				this.setState({ forceReload: false });
			}, 1000);
		});
	}

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	componentWillUnmount() {
		AppState.removeEventListener('change', this.handleAppStateChange);
		this.lockManager.stopListening();
		Engine.context.PersonalMessageManager.hub.removeAllListeners();
		Engine.context.TypedMessageManager.hub.removeAllListeners();
		Engine.context.TransactionController.hub.removeListener('unapprovedTransaction', this.onUnapprovedTransaction);
		WalletConnect.hub.removeAllListeners();
		PaymentChannelsClient.hub.removeAllListeners();
		PaymentChannelsClient.stop();
		this.removeConnectionStatusListener && this.removeConnectionStatusListener();
	}

	onSignAction = () => {
		this.setState({ signMessage: false });
	};

	renderSigningModal = () => {
		const { signMessage, signMessageParams, signType, currentPageTitle, currentPageUrl } = this.state;
		return (
			<Modal
				isVisible={signMessage}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onSignAction}
				onBackButtonPress={this.onSignAction}
				onSwipeComplete={this.onSignAction}
				swipeDirection={'down'}
				propagateSwipe
			>
				{signType === 'personal' && (
					<PersonalSign
						messageParams={signMessageParams}
						onCancel={this.onSignAction}
						onConfirm={this.onSignAction}
						currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					/>
				)}
				{signType === 'typed' && (
					<TypedSign
						messageParams={signMessageParams}
						onCancel={this.onSignAction}
						onConfirm={this.onSignAction}
						currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					/>
				)}
				{signType === 'eth' && (
					<MessageSign
						navigation={this.props.navigation}
						messageParams={signMessageParams}
						onCancel={this.onSignAction}
						onConfirm={this.onSignAction}
						currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					/>
				)}
			</Modal>
		);
	};

	onWalletConnectSessionApproval = () => {
		const { peerId } = this.state.walletConnectRequestInfo;
		this.setState({
			walletConnectRequest: false,
			walletConnectRequestInfo: {}
		});
		WalletConnect.hub.emit('walletconnectSessionRequest::approved', peerId);
	};

	onWalletConnectSessionRejected = () => {
		const peerId = this.state.walletConnectRequestInfo.peerId;
		this.setState({
			walletConnectRequest: false,
			walletConnectRequestInfo: {}
		});
		WalletConnect.hub.emit('walletconnectSessionRequest::rejected', peerId);
	};

	onPaymentChannelRequestApproval = () => {
		PaymentChannelsClient.hub.emit('payment::confirm', this.state.paymentChannelRequestInfo);
		this.setState({
			paymentChannelRequestLoading: true
		});
	};

	onPaymentChannelRequestRejected = () => {
		this.setState({
			paymentChannelRequest: false
		});
		setTimeout(() => this.setState({ paymentChannelRequestInfo: {} }), 1000);
	};

	renderWalletConnectSessionRequestModal = () => {
		const { walletConnectRequest, walletConnectRequestInfo } = this.state;
		const meta = walletConnectRequestInfo.peerMeta || null;

		return (
			<Modal
				isVisible={walletConnectRequest}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={this.onWalletConnectSessionRejected}
				onBackButtonPress={this.onWalletConnectSessionRejected}
				swipeDirection={'down'}
			>
				<WalletConnectSessionApproval
					onCancel={this.onWalletConnectSessionRejected}
					onConfirm={this.onWalletConnectSessionApproval}
					currentPageInformation={{
						title: meta && meta.name,
						url: meta && meta.url
					}}
					autosign={false}
				/>
			</Modal>
		);
	};

	renderWalletConnectReturnModal = () => (
		<WalletConnectReturnToBrowserModal modalVisible={this.state.walletConnectReturnModalVisible} />
	);

	renderPaymentChannelRequestApproval = () => {
		const {
			paymentChannelRequest,
			paymentChannelRequestInfo,
			paymentChannelRequestLoading,
			paymentChannelRequestCompleted
		} = this.state;

		return (
			<Modal
				isVisible={paymentChannelRequest}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={this.onPaymentChannelRequestRejected}
				onBackButtonPress={this.onPaymentChannelRequestRejected}
				swipeDirection={'down'}
			>
				<PaymentChannelApproval
					onCancel={this.onPaymentChannelRequestRejected}
					onConfirm={this.onPaymentChannelRequestApproval}
					info={paymentChannelRequestInfo}
					loading={paymentChannelRequestLoading}
					complete={paymentChannelRequestCompleted}
				/>
			</Modal>
		);
	};

	render() {
		const { forceReload } = this.state;

		return (
			<React.Fragment>
				<View style={styles.flex}>
					{!forceReload ? <MainNavigator navigation={this.props.navigation} /> : this.renderLoader()}
					<GlobalAlert />
					<FlashMessage
						position="bottom"
						MessageComponent={TransactionNotification}
						animationDuration={150}
					/>
					<FadeOutOverlay />
				</View>
				{this.renderSigningModal()}
				{this.renderWalletConnectSessionRequestModal()}
				{this.renderPaymentChannelRequestApproval()}
				{this.renderWalletConnectReturnModal()}
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => ({
	lockTime: state.settings.lockTime,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	paymentChannelsEnabled: state.settings.paymentChannelsEnabled,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	allTokens: state.engine.backgroundState.AssetsController.allTokens,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances
});

const mapDispatchToProps = dispatch => ({
	setEtherTransaction: transaction => dispatch(setEtherTransaction(transaction)),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Main);
