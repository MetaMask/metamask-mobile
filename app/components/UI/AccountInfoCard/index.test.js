import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import AccountInfoCard from './';

const mockStore = configureMockStore();

describe('AccountInfoCard', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: {
							'0x0': {
								balance: 200
							}
						}
					},
					PreferencesController: {
						selectedAddress: '0x0',
						identities: {
							address: '0x0',
							name: 'Account 1'
						}
					},
					CurrencyRateController: {
						conversionRate: 10
					}
				}
			}
		};

		const wrapper = shallow(<AccountInfoCard />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
