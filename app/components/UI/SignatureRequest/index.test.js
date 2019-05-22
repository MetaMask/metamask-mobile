import React from 'react';
import { shallow } from 'enzyme';
import SignatureRequest from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('SignatureRequest', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					PreferencesController: {
						selectedAddress: '0x2',
						identities: { '0x2': { address: '0x2', name: 'Account 1' } }
					},
					NetworkController: {
						provider: {
							type: 'ropsten'
						}
					}
				}
			}
		};

		const wrapper = shallow(<SignatureRequest currentPageInformation={{ title: 'title', url: 'url' }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
