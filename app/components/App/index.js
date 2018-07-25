import { createBottomTabNavigator } from 'react-navigation';
import BrowserScreen from '../BrowserScreen';
import WalletScreen from '../WalletScreen';

/**
 * Root application component responsible for configuring the tab navigator
 */
export default createBottomTabNavigator({
	Home: {
		screen: BrowserScreen
	},
	Wallet: {
		screen: WalletScreen
	}
});
