import React from 'react';
import { shallow } from 'enzyme';
import Confirm from './';
import configureMockStore from 'redux-mock-store';

describe('Confirm', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					NetworkController: {
						network: '1',
						provider: {
							ticker: 'ETH',
							type: 'mainnet'
						}
					},
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					TransactionController: {
						transactions: []
					},
					TokenRatesController: {
						contractExchangeRates: {}
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						conversionRate: 1
					},
					TokenBalancesController: {
						contractBalances: {}
					}
				}
			},
			settings: {
				showHexData: true
			},
			newTransaction: {
				selectedAsset: {},
				transaction: {
					from: '0x1',
					to: '0x2'
				}
			}
		};
		const wrapper = shallow(<Confirm />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
