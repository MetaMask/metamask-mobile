import React, { Component } from 'react';
// eslint-disable-next-line react-native/split-platform-components
import { ActivityIndicator, AppState, StyleSheet, View, PushNotificationIOS, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStackNavigator, createBottomTabNavigator } from 'react-navigation';
import GlobalAlert from '../../UI/GlobalAlert';
import FlashMessage from 'react-native-flash-message';
import BackgroundTimer from 'react-native-background-timer';
import Browser from '../../Views/Browser';
import AddBookmark from '../../Views/AddBookmark';
import SimpleWebview from '../../Views/SimpleWebview';
import Approval from '../../Views/Approval';
import Settings from '../../Views/Settings';
import GeneralSettings from '../../Views/GeneralSettings';
import AdvancedSettings from '../../Views/AdvancedSettings';
import AppInformation from '../../UI/AppInformation';
import SecuritySettings from '../../Views/SecuritySettings';
import ExperimentalSettings from '../../Views/ExperimentalSettings';
import Wallet from '../../Views/Wallet';
import TransactionsView from '../../Views/TransactionsView';
import SyncWithExtension from '../../Views/SyncWithExtension';
import Asset from '../../Views/Asset';
import AddAsset from '../../Views/AddAsset';
import Collectible from '../../Views/Collectible';
import CollectibleView from '../../Views/CollectibleView';
import Send from '../../Views/Send';
import RevealPrivateCredential from '../../Views/RevealPrivateCredential';
import WalletConnectSessions from '../../Views/WalletConnectSessions';
import QrScanner from '../../Views/QRScanner';
import LockScreen from '../../Views/LockScreen';
import ProtectYourAccount from '../../Views/ProtectYourAccount';
import ChoosePassword from '../../Views/ChoosePassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep2 from '../../Views/AccountBackupStep2';
import AccountBackupStep3 from '../../Views/AccountBackupStep3';
import AccountBackupStep4 from '../../Views/AccountBackupStep4';
import AccountBackupStep5 from '../../Views/AccountBackupStep5';
import AccountBackupStep6 from '../../Views/AccountBackupStep6';
import ImportPrivateKey from '../../Views/ImportPrivateKey';
import ImportPrivateKeySuccess from '../../Views/ImportPrivateKeySuccess';
import PaymentRequest from '../../UI/PaymentRequest';
import PaymentRequestSuccess from '../../UI/PaymentRequestSuccess';
import { TransactionNotification } from '../../UI/TransactionNotification';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import PushNotification from 'react-native-push-notification';
import I18n from '../../../../locales/i18n';
import { colors } from '../../../styles/common';
import LockManager from '../../../core/LockManager';
import OnboardingWizard from '../../UI/OnboardingWizard';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import { hexToBN, fromWei } from '../../../util/number';
import { setTransactionObject } from '../../../actions/transaction';
import PersonalSign from '../../UI/PersonalSign';
import TypedSign from '../../UI/TypedSign';
import Modal from 'react-native-modal';
import WalletConnect from '../../../core/WalletConnect';
import WalletConnectSessionApproval from '../../UI/WalletConnectSessionApproval';

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
				CompanySettings: {
					screen: AppInformation
				},
				SyncWithExtensionView: {
					screen: SyncWithExtension
				},
				RevealPrivateCredentialView: {
					screen: RevealPrivateCredential
				},
				WalletConnectSessionsView: {
					screen: WalletConnectSessions
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
		ApprovalView: {
			screen: createStackNavigator({
				Approval: {
					screen: Approval
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

class Main extends Component {
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
		 * Current onboarding wizard step
		 */
		wizardStep: PropTypes.number,
		/**
		 * Action that sets a transaction
		 */
		setTransactionObject: PropTypes.func,
		/**
		 * Object containing the information for the current transaction
		 */
		transaction: PropTypes.object
	};

	state = {
		forceReload: false,
		signMessage: false,
		signMessageParams: { data: '' },
		signType: '',
		walletConnectRequest: false,
		walletConnectRequestInfo: {}
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
		TransactionsNotificationManager.init(this.props.navigation);
		this.pollForIncomingTransactions();
		AppState.addEventListener('change', this.handleAppStateChange);
		this.lockManager = new LockManager(this.props.navigation, this.props.lockTime);
		PushNotification.configure({
			requestPermissions: false,
			onNotification: notification => {
				let data = null;
				if (Platform.OS === 'android') {
					if (notification.tag) {
						data = JSON.parse(notification.tag);
					}
				} else if (notification.data) {
					data = notification.data;
				}
				if (data && data.action === 'tx') {
					TransactionsNotificationManager.setTransactionToView(data.id);
					this.props.navigation.navigate('TransactionsHome');
				}

				if (Platform.OS === 'ios') {
					notification.finish(PushNotificationIOS.FetchResult.NoData);
				}
			}
		});

		Engine.context.TransactionController.hub.on('unapprovedTransaction', this.onUnapprovedTransaction);

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

		WalletConnect.hub.on('walletconnectSessionRequest', peerInfo => {
			this.setState({ walletConnectRequest: true, walletConnectRequestInfo: peerInfo });
		});
		WalletConnect.init();
	};

	onUnapprovedTransaction = transactionMeta => {
		if (this.props.transaction.value || this.props.transaction.to) {
			return;
		}
		const {
			transaction: { value, gas, gasPrice }
		} = transactionMeta;
		transactionMeta.transaction.value = hexToBN(value);
		transactionMeta.transaction.readableValue = fromWei(transactionMeta.transaction.value);
		transactionMeta.transaction.gas = hexToBN(gas);
		transactionMeta.transaction.gasPrice = hexToBN(gasPrice);
		this.props.setTransactionObject({
			...{ symbol: 'ETH', type: 'ETHER_TRANSACTION', assetType: 'ETH', id: transactionMeta.id },
			...transactionMeta.transaction
		});
		this.props.navigation.push('ApprovalView');
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
	}

	/**
	 * Return current step of onboarding wizard if not step 5 nor 0
	 */
	renderOnboardingWizard = () => {
		const { wizardStep } = this.props;
		return wizardStep !== 5 && wizardStep > 0 && <OnboardingWizard navigation={this.props.navigation} />;
	};

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
				swipeDirection={'down'}
			>
				<WalletConnectSessionApproval
					onCancel={this.onWalletConnectSessionRejected}
					onConfirm={this.onWalletConnectSessionApproval}
					currentPageInformation={{
						title: meta && meta.name,
						url: meta && meta.url
					}}
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
					{this.renderOnboardingWizard()}
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
			</React.Fragment>
		);
	}
}

const mapStateToProps = state => ({
	lockTime: state.settings.lockTime,
	wizardStep: state.wizard.step,
	transaction: state.transaction
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: asset => dispatch(setTransactionObject(asset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Main);
