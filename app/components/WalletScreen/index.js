import Wallet from '../Wallet';
import Browser from '../Browser';
import SeedWords from '../SeedWords';
import SyncWithExtension from '../SyncWithExtension';
import Asset from '../Asset';
import AccountDetails from '../AccountDetails';
import AddAsset from '../AddAsset';
import AppConfigurations from '../AppConfigurations';
import Collectible from '../Collectible';
import SendScreen from '../SendScreen';
import RevealPrivateCredential from '../RevealPrivateCredential';
import { createStackNavigator } from 'react-navigation';

export default createStackNavigator(
	{
		WalletView: {
			screen: Wallet
		},
		Asset: {
			screen: Asset
		},
		AccountDetails: {
			screen: AccountDetails
		},

		AddAsset: {
			screen: AddAsset
		},
		Collectible: {
			screen: Collectible
		},
		SendScreen: {
			screen: SendScreen
		},
		BrowserView: {
			screen: Browser
		},
		AppConfigurations: {
			screen: AppConfigurations
		},
		RevealPrivateCredential: {
			screen: RevealPrivateCredential
		},
		SeedWords: {
			screen: SeedWords
		},
		SyncWithExtension: {
			screen: SyncWithExtension
		}
	},
	{
		mode: 'modal'
	}
);

/**
 * Stack navigator component that wraps the content of the Wallet tab
 * including the viewsm that can be pushed on top of it


export default createStackNavigator(
	{
		Wallet: {
			screen: walletStackNavigator
		},
		BrowserView: {
			screen: createStackNavigator({

			})
		},
		SettingsView: {
			screen: createStackNavigator({
				AppConfigurations: {
					screen: AppConfigurations
				},
				RevealPrivateCredential: {
					screen: RevealPrivateCredential
				},
				SeedWords: {
					screen: SeedWords
				},
				SyncWithExtension: {
					screen: SyncWithExtension
				}
			})
		}
	},
	{
		mode: 'modal',
		headerMode: 'none'
	}
);

*/
