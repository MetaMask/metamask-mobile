import Browser from '../Browser';
import AddBookmark from '../AddBookmark';
import Approval from '../Approval';
import { createStackNavigator } from 'react-navigation';

/**
 * Main view component for the browser screen, renders a StackNavigator that
 * holds every approval view in the order they are triggered
 */
export default createStackNavigator(
	{
		Browser: {
			screen: Browser
		},
		AddBookmark: {
			screen: AddBookmark
		},
		Approval: {
			screen: Approval
		}
	},
	{
		mode: 'modal'
	}
);
