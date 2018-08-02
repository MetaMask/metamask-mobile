import Wallet from '../Wallet';
import Settings from '../Settings';
import { createStackNavigator } from 'react-navigation';

export default createStackNavigator({
	Wallet: {
		screen: Wallet
	},
	Settings: {
		screen: Settings
	}
});
