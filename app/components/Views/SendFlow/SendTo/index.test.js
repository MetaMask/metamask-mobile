import React from 'react';
import { shallow } from 'enzyme';
import SendTo from './';
import configureMockStore from 'redux-mock-store';

describe('SendTo', () => {
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
						},
						selectedAddress: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b'
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
					},
					KeyringController: { keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }] }
				}
			},
			settings: {
				primaryCurrency: 'fiat'
			},
			transaction: {
				selectedAsset: {}
			}
		};
		const wrapper = shallow(<SendTo />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
