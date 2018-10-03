import Transfer from '../Transfer';
import TransactionSubmitted from '../TransactionSubmitted';
import { createStackNavigator } from 'react-navigation';

export default createStackNavigator(
	{
		TransferView: {
			screen: Transfer
		},
		TransactionSubmitted: {
			screen: TransactionSubmitted
		}
	},
	{
		mode: 'modal'
	}
);
