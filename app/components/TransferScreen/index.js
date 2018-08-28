import Transfer from '../Transfer';
import QrScanner from '../QrScanner';
import { createStackNavigator } from 'react-navigation';

export default createStackNavigator({
	Transfer: {
		screen: Transfer
	},
	QrScanner: {
		screen: QrScanner,
		mode: 'modal'
	}
});
