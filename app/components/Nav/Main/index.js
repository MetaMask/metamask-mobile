import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { createStackNavigator } from 'react-navigation';
import GlobalAlert from '../../UI/GlobalAlert';

import Browser from '../../Views/Browser';
import BrowserHome from '../../Views/BrowserHome';
import AddBookmark from '../../Views/AddBookmark';
import Approval from '../../Views/Approval';
import Settings from '../../Views/Settings';
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
			screen: createStackNavigator({
				BrowserHome: {
					screen: BrowserHome
				},
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
		BrowserView: {
			screen: createStackNavigator(
				{
					Browser: {
						screen: Browser
					},
					ApprovalView: {
						screen: Approval
					},
					AddBookmark: {
						screen: AddBookmark
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
				SyncWithExtensionView: {
					screen: SyncWithExtension
				},
				RevealPrivateCredentialView: {
					screen: RevealPrivateCredential
				}
			})
		},
		SendView: {
			screen: createStackNavigator({
				Send: {
					screen: Send
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

	render = () => (
		<View style={styles.flex}>
			<MainNavigator navigation={this.props.navigation} />
			<GlobalAlert />
		</View>
	);
}
