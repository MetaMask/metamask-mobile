import Wallet from '../Wallet';
import Settings from '../Settings';
import Asset from '../Asset';
import { createStackNavigator } from 'react-navigation';

/**
 * Stack navigator component that wraps the content of the Wallet tab
 * including the viewsm that can be pushed on top of it
 */

export default createStackNavigator({
	Wallet: {
		screen: Wallet
	},
	Settings: {
		screen: Settings
	},
	Asset: {
		screen: Asset
	}
});
