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

const walletStackNavigator = createStackNavigator({
	WalletView: {
		screen: Wallet
	},
	AccountDetails: {
		screen: AccountDetails
	},
	RevealPrivateCredential: {
		screen: RevealPrivateCredential
	},
	SeedWords: {
		screen: SeedWords
	},
	SyncWithExtension: {
		screen: SyncWithExtension
	},
	Asset: {
		screen: Asset
	},
	AddAsset: {
		screen: AddAsset
	},
	AppConfigurations: {
		screen: AppConfigurations
	},
	Collectible: {
		screen: Collectible
	},
	SendScreen: {
		screen: SendScreen
	}
});

/**
 * Stack navigator component that wraps the content of the Wallet tab
 * including the viewsm that can be pushed on top of it
 */

export default createStackNavigator(
	{
		Wallet: {
			screen: walletStackNavigator
		},
		BrowserView: {
			screen: createStackNavigator({
				BrowserModalView: {
					screen: Browser
				}
			})
		}
	},
	{
		mode: 'modal',
		headerMode: 'none'
	}
);
