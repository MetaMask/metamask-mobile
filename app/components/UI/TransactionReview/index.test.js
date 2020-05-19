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
					PreferencesController: {
						selectedAddress: '0x2'
					},
					AccountTrackerController: {
						accounts: []
					},
					AssetsController: {
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
				showHexData: true
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
