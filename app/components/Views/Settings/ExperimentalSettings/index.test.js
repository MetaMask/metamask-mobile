import React from 'react';
import { shallow } from 'enzyme';
import ExperimentalSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	privacy: { approvedHosts: {}, privacyMode: true },
	browser: { history: [] },
	settings: { lockTime: 1000 },
	engine: {
		backgroundState: {
			PreferencesController: { selectedAddress: '0x', identities: { '0x': { name: 'Account 1' } } },
			AccountTrackerController: { accounts: {} }
		}
	}
};
const store = mockStore(initialState);

describe('ExperimentalSettings', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<ExperimentalSettings route={{ params: {} }} />
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
