import Browser from '../Browser';
import TransactionEditor from '../TransactionEditor';
import { createStackNavigator } from 'react-navigation';

/**
 * Main view component for the browser screen, renders a stack container
 * that holds the browser and the approvals creen
 */
export default createStackNavigator(
	{
		// Browser: {
		// 	screen: Browser
		// },
		Approval: {
			screen: TransactionEditor
		}
	},
	{ mode: 'modal' }
);
