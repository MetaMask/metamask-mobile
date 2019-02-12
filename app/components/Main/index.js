import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { createStackNavigator } from 'react-navigation';
import GlobalAlert from '../GlobalAlert';

import Browser from '../Browser';
import BrowserHome from '../BrowserHome';
import AddBookmark from '../AddBookmark';
import Approval from '../Approval';
import Settings from '../Settings';
import Wallet from '../Wallet';
import SyncWithExtension from '../SyncWithExtension';
import Asset from '../Asset';
import AccountDetails from '../AccountDetails';
import AddAsset from '../AddAsset';
import Collectible from '../Collectible';
import CollectibleView from '../CollectibleView';
import Send from '../Send';
import RevealPrivateCredential from '../RevealPrivateCredential';
import QrScanner from '../QRScanner';
import LockScreen from '../LockScreen';
import TransactionSubmitted from '../TransactionSubmitted';
import FirstIncomingTransaction from '../FirstIncomingTransaction';
import ProtectYourAccount from '../ProtectYourAccount';
import ChoosePassword from '../ChoosePassword';
import AccountBackupStep1 from '../AccountBackupStep1';
import AccountBackupStep2 from '../AccountBackupStep2';
import AccountBackupStep3 from '../AccountBackupStep3';
import AccountBackupStep4 from '../AccountBackupStep4';
import AccountBackupStep5 from '../AccountBackupStep5';
import AccountBackupStep6 from '../AccountBackupStep6';

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
