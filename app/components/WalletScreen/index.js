import Wallet from '../Wallet';
import Settings from '../Settings';
import Asset from '../Asset';
import { createStackNavigator } from 'react-navigation';

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
