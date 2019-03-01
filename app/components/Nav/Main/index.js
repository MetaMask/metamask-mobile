import React, { Component } from 'react';
// eslint-disable-next-line react-native/split-platform-components
import { AppState, StyleSheet, View, PushNotificationIOS, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { createStackNavigator, createBottomTabNavigator } from 'react-navigation';
import GlobalAlert from '../../UI/GlobalAlert';
import FlashMessage from 'react-native-flash-message';
import BackgroundTimer from 'react-native-background-timer';
import Browser from '../../Views/Browser';
import BrowserHome from '../../Views/BrowserHome';
import AddBookmark from '../../Views/AddBookmark';
import SimpleWebview from '../../Views/SimpleWebview';
import Approval from '../../Views/Approval';
import Settings from '../../Views/Settings';
import GeneralSettings from '../../Views/GeneralSettings';
import AdvancedSettings from '../../Views/AdvancedSettings';
import AppInformation from '../../UI/AppInformation';
import SecuritySettings from '../../Views/SecuritySettings';
import Wallet from '../../Views/Wallet';
import SyncWithExtension from '../../Views/SyncWithExtension';
import Asset from '../../Views/Asset';
import AccountDetails from '../../Views/AccountDetails';
import AddAsset from '../../Views/AddAsset';
import Collectible from '../../Views/Collectible';
import CollectibleView from '../../Views/CollectibleView';
import Send from '../../Views/Send';
import RevealPrivateCredential from '../../Views/RevealPrivateCredential';
import QrScanner from '../../Views/QRScanner';
import LockScreen from '../../Views/LockScreen';
import TransactionSubmitted from '../../Views/TransactionSubmitted';
import FirstIncomingTransaction from '../../Views/FirstIncomingTransaction';
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
import { TransactionNotification } from '../../UI/TransactionNotification';
import TransactionsNotificationManager from '../../../core/TransactionsNotificationManager';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import PushNotification from 'react-native-push-notification';

const styles = StyleSheet.create({
	flex: {
		flex: 1
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
						BrowserHome: {
							screen: BrowserHome
						},
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
						AccountDetails: {
							screen: AccountDetails
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
				CompanySettings: {
					screen: AppInformation
				},
				SyncWithExtensionView: {
					screen: SyncWithExtension
				},
				RevealPrivateCredentialView: {
					screen: RevealPrivateCredential
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
		TransactionSubmitted: {
			screen: TransactionSubmitted
		},
		SetPasswordFlow: {
			screen: createStackNavigator(
				{
					FirstIncomingTransaction: {
						screen: FirstIncomingTransaction
					},
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
						screen: AccountBackupStep6
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

export default class Main extends Component {
	static router = {
		...MainNavigator.router
	};
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	backgroundMode = false;

	pollForIncomingTransactions = async () => {
		await Engine.refreshTransactionHistory();
		// Stop polling if the app is in the background
		if (!this.backgroundMode) {
			setTimeout(() => {
				this.pollForIncomingTransactions();
			}, AppConstants.TX_CHECK_NORMAL_FREQUENCY);
		}
	};

	componentDidMount() {
		TransactionsNotificationManager.init(this.props.navigation);
		this.pollForIncomingTransactions();
		AppState.addEventListener('change', this.handleAppStateChange);

		PushNotification.configure({
			requestPermissions: true,
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
					this.props.navigation.navigate('WalletTabHome');
					this.props.navigation.navigate('WalletView', { page: 0 });
					setTimeout(() => {
						this.props.navigation.navigate('WalletView', { page: 2 });
					}, 300);
				}

				if (Platform.OS === 'ios') {
					notification.finish(PushNotificationIOS.FetchResult.NoData);
				}
			}
		});
	}

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

	componentWillUnmount() {
		AppState.removeEventListener('change', this.handleAppStateChange);
	}

	render = () => (
		<View style={styles.flex}>
			<MainNavigator navigation={this.props.navigation} />
			<GlobalAlert />
			<FlashMessage position="bottom" MessageComponent={TransactionNotification} animationDuration={150} />
		</View>
	);
}
