import React from 'react';
import { shallow } from 'enzyme';
import ExperimentalSettings from './';
import configureMockStore from 'redux-mock-store';

describe('ExperimentalSettings', () => {
	const mockStore = configureMockStore();

	it('should render correctly', () => {
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

		const wrapper = shallow(
			<ExperimentalSettings
				navigation={{
					state: { params: {} }
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
