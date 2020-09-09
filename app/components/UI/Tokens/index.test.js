import React from 'react';
import { shallow } from 'enzyme';
import Tokens from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Tokens', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AssetsController: {
						tokens: []
					},
					TokenRatesController: {
						contractExchangeRates: {}
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						conversionRate: 1
					},
					TokenBalancesController: {
						contractBalance: {}
					},
					NetworkController: {
						network: '1'
					}
				}
			},
			settings: {
				primaryCurrency: 'usd'
			}
		};

		const wrapper = shallow(<Tokens />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
