import React from 'react';
import PersonalSign from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('PersonalSign', () => {
	it('should render correctly', () => {
		const initialState = {
			backgroundState: {
				AccountTrackerController: {
					accounts: { '0x2': { balance: '0' } }
				},
				PreferencesController: {
					selectedAddress: '0x2',
					identities: { '0x2': { address: '0x2', name: 'Account 1' } }
				}
			}
		};
		const wrapper = shallow(
			<PersonalSign navigation={{ state: { params: { messageParams: { from: '0x2', message: '0x879' } } } }} />,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
