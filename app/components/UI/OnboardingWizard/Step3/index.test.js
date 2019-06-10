import React from 'react';
import Step3 from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Step3', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: {
						selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
						identities: { '0xe7E125654064EEa56229f273dA586F10DF96B0a1': { name: 'Account 1' } }
					},
					AccountTrackerController: {
						accounts: {
							'0xe7E125654064EEa56229f273dA586F10DF96B0a1': {
								name: 'account 1',
								address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
								balance: 0
							}
						}
					},
					CurrencyRateController: {
						currentCurrecy: 'USD'
					}
				}
			}
		};

		const wrapper = shallow(<Step3 coachmarkRef={{}} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
