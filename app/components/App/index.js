import { createBottomTabNavigator } from 'react-navigation';
import BrowserScreen from '../BrowserScreen';

/**
 * Root application component responsible for configurating the tab navigator
 */
export default createBottomTabNavigator({
	Home: {
		screen: BrowserScreen
	}
});
