import React from 'react';
import { shallow } from 'enzyme';
import SecuritySettings from './';
import configureMockStore from 'redux-mock-store';

describe('SecuritySettings', () => {
	const mockStore = configureMockStore();

	it('should render correctly', () => {
		const initialState = {
			privacy: { approvedHosts: {}, privacyMode: true },
			browser: { history: [] },
			settings: { lockTime: 1000 },
			user: { passwordSet: true },
			engine: {
				backgroundState: {
					PreferencesController: { selectedAddress: '0x', identities: { '0x': { name: 'Account 1' } } },
					AccountTrackerController: { accounts: {} },
					KeyringController: { keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }] }
				}
			}
		};

		const wrapper = shallow(
			<SecuritySettings
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
