import React from 'react';
import TransactionReview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const generateTransform = jest.fn();
const initialState = {
	engine: {
		backgroundState: {
			PreferencesController: {
				selectedAddress: '0x2'
			},
			AccountTrackerController: {
				accounts: []
			},
			TokensController: {
				tokens: []
			},
			CurrencyRateController: {
				currentCurrency: 'usd'
			},
			TokenRatesController: {
				contractExchangeRates: {
					'0x': '0.1'
				}
			},
			NetworkController: {
				provider: {
					ticker: 'ETH'
				}
			}
		}
	},
	settings: {
		showHexData: true,
		primaryCurrency: 'ETH'
	},
	transaction: {
		value: '',
		data: '',
		from: '0x1',
		gas: '',
		gasPrice: '',
		to: '0x2',
		selectedAsset: undefined,
		assetType: undefined
	},
	browser: {
		tabs: []
	}
};
const store = mockStore(initialState);

describe('TransactionReview', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<TransactionReview
					route={{ params: {} }}
					transactionData={{ amount: 0, gas: 0, gasPrice: 1, from: '0x0' }}
					generateTransform={generateTransform}
				/>
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
