import React from 'react';
import TypedSign from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TypedSign', () => {
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
			<TypedSign
				navigation={{ state: { params: { messageParams: { from: '0x2', message: '0x879' } } } }}
				messageParams={{ data: { type: 'string', name: 'Message', value: 'Hi, Alice!' } }}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
