import React, { PureComponent } from 'react';
import {
	InteractionManager,
	ActivityIndicator,
	AppState,
	StyleSheet,
	View,
	PushNotificationIOS, // eslint-disable-line react-native/split-platform-components
	Alert,
	Image
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStackNavigator } from 'react-navigation-stack';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import ENS from 'ethjs-ens';
import GlobalAlert from '../../UI/GlobalAlert';
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
import ChoosePasswordSimple from '../../Views/ChoosePasswordSimple';
import EnterPasswordSimple from '../../Views/EnterPasswordSimple';
import ChoosePassword from '../../Views/ChoosePassword';
import ResetPassword from '../../Views/ResetPassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import ImportPrivateKey from '../../Views/ImportPrivateKey';
import PaymentChannel from '../../Views/PaymentChannel';
import ImportPrivateKeySuccess from '../../Views/ImportPrivateKeySuccess';
import PaymentRequest from '../../UI/PaymentRequest';
import PaymentRequestSuccess from '../../UI/PaymentRequestSuccess';
import NotificationManager from '../../../core/NotificationManager';
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
import Approve from '../../Views/ApproveView/Approve';
import Amount from '../../Views/SendFlow/Amount';
import Confirm from '../../Views/SendFlow/Confirm';
import ContactForm from '../../Views/Settings/Contacts/ContactForm';
import TransactionTypes from '../../../core/TransactionTypes';
import BackupAlert from '../../UI/BackupAlert';
import Notification from '../../UI/Notification';
import FiatOrders from '../../UI/FiatOrders';
import PaymentMethodSelector from '../../UI/FiatOrders/PaymentMethodSelector';
import PaymentMethodApplePay from '../../UI/FiatOrders/PaymentMethodApplePay';
import TransakWebView from '../../UI/FiatOrders/TransakWebView';
import {
	showTransactionNotification,
	hideTransactionNotification,
	showSimpleNotification
} from '../../../actions/notification';
import { toggleDappTransactionModal, toggleApproveModal } from '../../../actions/modals';
import AccountApproval from '../../UI/AccountApproval';
import ActivityView from '../../Views/ActivityView';
import ProtectYourWalletModal from '../../UI/ProtectYourWalletModal';

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
	},
	headerLogo: {
		width: 125,
		height: 50
	}
});

function HeaderLogo() {
	return (
		<Image style={styles.headerLogo} source={require('../../../images/metamask-name.png')} resizeMode={'contain'} />
	);
}

/**
 * Navigator component that wraps
 * the 2 main sections: Browser, Wallet
 */
const MainNavigator = createStackNavigator(
	{
		Home: {
			screen: createBottomTabNavigator(
				{
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
					BrowserTabHome: createStackNavigator({
						BrowserView: {
							screen: Browser,
							navigationOptions: {
								gesturesEnabled: false
							}
						}
					}),
					TransactionsHome: createStackNavigator({
						TransactionsView: {
							screen: ActivityView
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
				ResetPassword: {
					screen: ResetPassword
				},
				ManualBackupStep1: {
					screen: ManualBackupStep1
				},
				ManualBackupStep2: {
					screen: ManualBackupStep2
				},
				ManualBackupStep3: {
					screen: ManualBackupStep3
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

		FiatOnRamp: {
			screen: createStackNavigator({
				PaymentMethodSelector: { screen: PaymentMethodSelector },
				PaymentMethodApplePay: { screen: PaymentMethodApplePay },
				TransakFlow: { screen: TransakWebView }
			})
		},

		SetPasswordFlow: {
			screen: createStackNavigator(
				{
					ChoosePassword: {
						screen: ChoosePassword
					},
					AccountBackupStep1: {
						screen: AccountBackupStep1
					},
					AccountBackupStep1B: {
						screen: AccountBackupStep1B
					},
					ManualBackupStep1: {
						screen: ManualBackupStep1
					},
					ManualBackupStep2: {
						screen: ManualBackupStep2
					},
					ManualBackupStep3: {
						screen: ManualBackupStep3
					}
				},
				{
					defaultNavigationOptions: {
						// eslint-disable-next-line
						headerTitle: () => <HeaderLogo />,
						headerStyle: {
							borderBottomWidth: 0
						}
					}
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
		 * List of transactions
		 */
		transactions: PropTypes.array,
		/**
		 * A string representing the network name
		 */
		providerType: PropTypes.string,
		/**
		 * Dispatch showing a transaction notification
		 */
		showTransactionNotification: PropTypes.func,
		/**
		 * Dispatch showing a simple notification
		 */
		showSimpleNotification: PropTypes.func,
		/**
		 * Dispatch hiding a transaction notification
		 */
		hideTransactionNotification: PropTypes.func,
		/**
		 * Indicates whether the current transaction is a payment channel transaction
		 */
		isPaymentChannelTransaction: PropTypes.bool,
		/**
		 * Indicates whether the current transaction is a deep link transaction
		 */
		isPaymentRequest: PropTypes.bool,
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * Indicates whether third party API mode is enabled
		 */
		thirdPartyApiMode: PropTypes.bool,
		/**
		/* Hides or shows dApp transaction modal
		*/
		toggleDappTransactionModal: PropTypes.func,
		/**
		/* Hides or shows approve modal
		*/
		toggleApproveModal: PropTypes.func,
		/**
		/* dApp transaction modal visible or not
		*/
		dappTransactionModalVisible: PropTypes.bool,
		/**
		/* Token approve modal visible or not
		*/
		approveModalVisible: PropTypes.bool
	};
	state = {
		connected: true,
		forceReload: false,
		signMessage: false,
		signMessageParams: { data: '' },
		signType: '',
		walletConnectRequest: false,
		walletConnectRequestInfo: {},
		paymentChannelRequest: false,
		paymentChannelRequestLoading: false,
		paymentChannelRequestCompleted: false,
		paymentChannelRequestInfo: {},
		showExpandedMessage: false,
		paymentChannelBalance: null,
		paymentChannelReady: false
	};

	backgroundMode = false;
	locale = I18n.locale;

	pollForIncomingTransactions = async () => {
		this.props.thirdPartyApiMode && (await Engine.refreshTransactionHistory());
		// Stop polling if the app is in the background
		if (!this.backgroundMode) {
			setTimeout(() => {
				this.pollForIncomingTransactions();
			}, AppConstants.TX_CHECK_NORMAL_FREQUENCY);
		}
	};
	componentDidMount = async () => {
		InteractionManager.runAfterInteractions(() => {
			this.initializeWalletConnect();
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
							NotificationManager.setTransactionToView(data.id);
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
				NotificationManager.init(
					this.props.navigation,
					this.props.showTransactionNotification,
					this.props.hideTransactionNotification,
					this.props.showSimpleNotification
				);
				this.pollForIncomingTransactions();

				// Only if enabled under settings
				if (this.props.paymentChannelsEnabled) {
					this.initializePaymentChannels();
				}

				this.removeConnectionStatusListener = NetInfo.addEventListener(this.connectionChangeHandler);
			}, 1000);
		});
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
		WalletConnect.init();
	};

	initiatePaymentChannelRequest = ({ amount, to }) => {
		this.props.setTransactionObject({
			selectedAsset: {
				address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
				decimals: 18,
				logo: 'sai.svg',
				symbol: 'SAI',
				assetBalance: this.state.paymentChannelBalance
			},
			value: amount,
			readableValue: amount,
			transactionTo: to,
			from: this.props.selectedAddress,
			transactionFromName: this.props.identities[this.props.selectedAddress].name,
			paymentChannelTransaction: true,
			type: 'PAYMENT_CHANNEL_TRANSACTION'
		});

		this.props.navigation.navigate('Confirm');
	};

	onPaymentChannelStateChange = state => {
		if (state.balance !== this.state.paymentChannelBalance || !this.state.paymentChannelReady) {
			this.setState({
				paymentChannelBalance: state.balance,
				paymentChannelReady: true
			});
		}
	};

	initializePaymentChannels = () => {
		PaymentChannelsClient.init(this.props.selectedAddress);
		PaymentChannelsClient.hub.on('state::change', this.onPaymentChannelStateChange);
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
							this.initiatePaymentChannelRequest(validRequest);
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
			} else {
				this.initiatePaymentChannelRequest(validRequest);
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
					NotificationManager.watchSubmittedTransaction({
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
			Logger.error(error, 'error while trying to send transaction (Main)');
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
				!this.props.approveModalVisible && this.props.toggleApproveModal();
			} else {
				this.props.toggleDappTransactionModal();
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

	toggleExpandedMessage = () => {
		this.setState({ showExpandedMessage: !this.state.showExpandedMessage });
	};

	renderSigningModal = () => {
		const {
			signMessage,
			signMessageParams,
			signType,
			currentPageTitle,
			currentPageUrl,
			showExpandedMessage
		} = this.state;
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
				onBackButtonPress={showExpandedMessage ? this.toggleExpandedMessage : this.onSignAction}
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
						toggleExpandedMessage={this.toggleExpandedMessage}
						showExpandedMessage={showExpandedMessage}
					/>
				)}
				{signType === 'typed' && (
					<TypedSign
						messageParams={signMessageParams}
						onCancel={this.onSignAction}
						onConfirm={this.onSignAction}
						currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
						toggleExpandedMessage={this.toggleExpandedMessage}
						showExpandedMessage={showExpandedMessage}
					/>
				)}
				{signType === 'eth' && (
					<MessageSign
						navigation={this.props.navigation}
						messageParams={signMessageParams}
						onCancel={this.onSignAction}
						onConfirm={this.onSignAction}
						currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
						toggleExpandedMessage={this.toggleExpandedMessage}
						showExpandedMessage={showExpandedMessage}
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
				<AccountApproval
					onCancel={this.onWalletConnectSessionRejected}
					onConfirm={this.onWalletConnectSessionApproval}
					currentPageInformation={{
						title: meta && meta.name,
						url: meta && meta.url
					}}
					walletConnectRequest
				/>
			</Modal>
		);
	};

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

	renderDappTransactionModal = () => (
		<Approval
			dappTransactionModalVisible={this.props.dappTransactionModalVisible}
			toggleDappTransactionModal={this.props.toggleDappTransactionModal}
		/>
	);

	renderApproveModal = () =>
		this.props.approveModalVisible && <Approve modalVisible toggleApproveModal={this.props.toggleApproveModal} />;

	render() {
		const { isPaymentChannelTransaction, isPaymentRequest } = this.props;
		const { forceReload } = this.state;
		return (
			<React.Fragment>
				<View style={styles.flex}>
					{!forceReload ? (
						<MainNavigator
							navigation={this.props.navigation}
							screenProps={{ isPaymentChannelTransaction, isPaymentRequest }}
						/>
					) : (
						this.renderLoader()
					)}
					<GlobalAlert />
					<FadeOutOverlay />
					<Notification navigation={this.props.navigation} />
					<FiatOrders />
					<BackupAlert navigation={this.props.navigation} />
					<ProtectYourWalletModal navigation={this.props.navigation} />
				</View>
				{this.renderSigningModal()}
				{this.renderWalletConnectSessionRequestModal()}
				{this.renderDappTransactionModal()}
				{this.renderApproveModal()}
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => ({
	lockTime: state.settings.lockTime,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	paymentChannelsEnabled: state.settings.paymentChannelsEnabled,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	isPaymentChannelTransaction: state.transaction.paymentChannelTransaction,
	isPaymentRequest: state.transaction.paymentRequest,
	identities: state.engine.backgroundState.PreferencesController.identities,
	dappTransactionModalVisible: state.modals.dappTransactionModalVisible,
	approveModalVisible: state.modals.approveModalVisible
});

const mapDispatchToProps = dispatch => ({
	setEtherTransaction: transaction => dispatch(setEtherTransaction(transaction)),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showTransactionNotification: args => dispatch(showTransactionNotification(args)),
	showSimpleNotification: args => dispatch(showSimpleNotification(args)),
	hideTransactionNotification: () => dispatch(hideTransactionNotification()),
	toggleDappTransactionModal: (show = null) => dispatch(toggleDappTransactionModal(show)),
	toggleApproveModal: show => dispatch(toggleApproveModal(show))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Main);
