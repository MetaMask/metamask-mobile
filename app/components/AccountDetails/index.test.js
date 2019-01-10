import React from 'react';
import { shallow } from 'enzyme';
import AccountDetails from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Account Details', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: {
						selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
						identities: { '0xe7E125654064EEa56229f273dA586F10DF96B0a1': { name: 'Account 1' } }
					},
					NetworkController: {
						provider: {
							type: 'mainnet'
						}
					}
				}
			}
		};

		const wrapper = shallow(<AccountDetails navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
