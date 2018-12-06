import React from 'react';
import SignatureRequest from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('SignatureRequest', () => {
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

		const wrapper = shallow(<SignatureRequest />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
