import React from 'react';
import TransactionReview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TransactionReview', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					PreferencesController: {
						selectedAddress: '0x2'
					},
					CurrencyRateController: {
						currentCurrency: 'usd',
						conversionRate: 0.1
					}
				}
			}
		};

		const wrapper = shallow(
			<TransactionReview
				navigation={{ state: { params: {} } }}
				transactionData={{ amount: 0, gas: 0, gasPrice: 1, from: '0x0' }}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
