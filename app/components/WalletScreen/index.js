import Wallet from '../Wallet';
import Settings from '../Settings';
import NetworkSettings from '../NetworkSettings';
import SeedWords from '../SeedWords';
import Asset from '../Asset';
import AccountDetails from '../AccountDetails';
import AddAsset from '../AddAsset';
import { createStackNavigator } from 'react-navigation';

/**
 * Stack navigator component that wraps the content of the Wallet tab
 * including the viewsm that can be pushed on top of it
 */
export default createStackNavigator({
	Wallet: {
		screen: Wallet
	},
	AccountDetails: {
		screen: AccountDetails
	},
	Settings: {
		screen: Settings
	},
	NetworkSettings: {
		screen: NetworkSettings
	},
	SeedWords: {
		screen: SeedWords
	},
	Asset: {
		screen: Asset
	},
	AddAsset: {
		screen: AddAsset
	}
});
