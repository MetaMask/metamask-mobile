import { createDrawerNavigator } from 'react-navigation';
import Main from '../Main';
import AccountList from '../AccountList';

/**
 * Root application component responsible for configuring app navigation
 * and instantiating the core Engine module
 */

export default createDrawerNavigator(
	{
		Main: {
			screen: Main
		}
	},
	{
		contentComponent: AccountList
	}
);
