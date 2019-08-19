import React from 'react';
import { shallow } from 'enzyme';
import PaymentChannel from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('PaymentChannel', () => {
	it('should render correctly', () => {
		const initialState = {
			settings: {
				paymentChannelsEnabled: true
			},
			engine: {
				backgroundState: {
					NetworkController: {
						provider: {
							type: 'ropsten',
							ticker: 'ETH'
						}
					},
					TransactionController: {
						internalTransactions: [],
						transactions: []
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						nativeCurrency: 'ETH',
						conversionRate: 100
					},
					PreferencesController: {
						selectedAddress: '0x1'
					},
					TokenRatesController: {
						contractExchangeRates: {}
					}
				}
			}
		};

		const wrapper = shallow(<PaymentChannel />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
