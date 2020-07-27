import React from 'react';
import TransactionReviewData from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TransactionReviewData', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					TokenRatesController: {
						contractExchangeRates: {}
					},
					CurrencyRateController: {
						currentCurrency: 'usd',
						conversionRate: 0.1
					}
				}
			},
			transaction: {
				transaction: {
					data: ''
				},
				value: '',
				from: '0x1',
				gas: '',
				gasPrice: '',
				to: '0x2',
				selectedAsset: undefined,
				assetType: undefined
			}
		};

		const wrapper = shallow(
			<TransactionReviewData transactionData={{ amount: 0, gas: 0, gasPrice: 1, from: '0x0' }} />,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
