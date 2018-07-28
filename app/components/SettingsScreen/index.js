import Settings from '../Settings';
import { createStackNavigator } from 'react-navigation';

export default createStackNavigator({
	Settings: {
		screen: Settings
	}
});
