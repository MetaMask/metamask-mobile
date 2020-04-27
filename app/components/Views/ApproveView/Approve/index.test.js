import React from 'react';
import { shallow } from 'enzyme';
import Approve from './';
import configureMockStore from 'redux-mock-store';
import { BN } from 'gaba';

const mockStore = configureMockStore();

describe('Approve', () => {
	it('should render correctly', () => {
		const initialState = {
			transaction: {},
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					NetworkController: {
						provider: {
							ticker: 'ETH'
						}
					},
					TransactionController: {
						transactions: []
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						conversionRate: 100
					},
					PreferencesController: {
						selectedAddress: '0x1',
						identities: { '0x1': { name: 'Account 1' } }
					},
					TokenBalancesController: {
						contractBalances: { '0x2': new BN(0) }
					},
					AssetsController: {
						tokens: []
					}
				}
			}
		};

		const wrapper = shallow(<Approve />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
