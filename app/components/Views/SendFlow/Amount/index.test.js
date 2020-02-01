import React from 'react';
import { shallow } from 'enzyme';
import Amount from './';
import configureMockStore from 'redux-mock-store';

describe('Amount', () => {
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
					AddressBookController: {
						addressBook: {
							'0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
								address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
								chainId: '1',
								isEns: false,
								memo: '',
								name: 'aa'
							}
						}
					},
					PreferencesController: {
						identities: {
							'0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
								address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
								name: 'Account 1'
							}
						}
					},
					TransactionController: {
						transactions: []
					},
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
					}
				}
			},
			settings: {
				primaryCurrency: 'fiat'
			},
			newTransaction: {
				selectedAsset: {}
			}
		};
		const wrapper = shallow(<Amount />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
