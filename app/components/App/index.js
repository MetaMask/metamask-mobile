import { createDrawerNavigator } from 'react-navigation';
import Main from '../Main';
import Accounts from '../Accounts';

/**
 * Root application component responsible for configuring the tab navigator
 */

export default createDrawerNavigator(
	{
		Main: {
			screen: Main
		}
	},
	{
		contentComponent: Accounts
	}
);
