import React from 'react';
import TransactionReviewInformation from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TransactionReviewInformation', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: {
						selectedAddress: '0x2'
					},
					TokenRatesController: {
						contractExchangeRates: {}
					},
					CurrencyRateController: {
						currentCurrency: 'usd',
						conversionRate: 0.1
					}
				}
			}
		};

		const wrapper = shallow(
			<TransactionReviewInformation transactionData={{ amount: 0, gas: 0, gasPrice: 1, from: '0x0' }} />,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
