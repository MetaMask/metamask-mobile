import React from 'react';
import TransactionReviewData from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
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
const store = mockStore(initialState);

describe('TransactionReviewData', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<TransactionReviewData transactionData={{ amount: 0, gas: 0, gasPrice: 1, from: '0x0' }} />
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
