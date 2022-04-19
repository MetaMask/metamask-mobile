import { PermissionStatus, RESULTS } from 'react-native-permissions';

export const handleBluetoothPermission = (bluetoothPermissionStatus: PermissionStatus) => {
	switch (bluetoothPermissionStatus) {
		case RESULTS.GRANTED:
			return true;
		default:
			return false;
	}
};

export default handleBluetoothPermission;
