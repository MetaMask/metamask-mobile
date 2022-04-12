import React from 'react';
import { shallow } from 'enzyme';
import Scan from './Scan';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

jest.mock('react-native-ble-plx', () => ({
	BleManager: () => ({
		onStateChange: () => ({
			remove: jest.fn(),
		}),
	}),
}));

jest.mock('react-native-permissions', () => ({
	check: jest.fn().mockRejectedValue('granted'),
	checkMultiple: jest.fn().mockRejectedValue({
		'android.permission.ACCESS_FINE_LOCATION': 'granted',
		'android.permission.BLUETOOTH_SCAN': 'granted',
		'android.permission.BLUETOOTH_CONNECT': 'granted',
	}),
	PERMISSIONS: {
		IOS: {
			BLUETOOTH_PERIPHERAL: 'ios.permission.BLUETOOTH_PERIPHERAL',
		},
		ANDROID: {
			ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
			BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
			BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
		},
	},
	openSettings: jest.fn(),
}));

describe('Scan', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<Scan onDeviceSelected={jest.fn()} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
