import { createDrawerNavigator } from 'react-navigation';
import Main from '../Main';
import AccountList from '../AccountList';

/**
 * Root application component responsible for instantiating
 * the two top level views: Main and AccountList
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
