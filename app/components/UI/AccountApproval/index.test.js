import React from 'react';
import AccountApproval from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AccountApproval', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					NetworkController: {
						provider: {
							type: 'ropsten'
						}
					},
					AssetsController: {
						tokens: []
					},
					PreferencesController: {
						selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
						identities: { '0xe7E125654064EEa56229f273dA586F10DF96B0a1': { name: 'Account 1' } }
					}
				}
			}
		};

		const wrapper = shallow(<AccountApproval currentPageInformation={{ icon: '', url: '', title: '' }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
