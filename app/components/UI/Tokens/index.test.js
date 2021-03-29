import React from 'react';
import { shallow } from 'enzyme';
import Tokens from './';
import configureMockStore from 'redux-mock-store';
import { BN } from 'ethereumjs-util';

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
						provider: { chainId: '1' }
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

	it('should hide zero balance tokens when setting is on', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AssetsController: {
						tokens: [
							{ symbol: 'ETH', address: '0x0', decimals: 18 },
							{ symbol: 'BAT', address: '0x01', decimals: 18 },
							{ symbol: 'LINK', address: '0x02', decimals: 18 }
						]
					},
					TokenRatesController: {
						contractExchangeRates: {}
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						conversionRate: 1
					},
					TokenBalancesController: {
						contractBalances: {
							'0x0': new BN(0),
							'0x01': new BN(2),
							'0x02': new BN(0)
						}
					},
					NetworkController: {
						provider: { chainId: '1' }
					}
				}
			},
			settings: {
				primaryCurrency: 'usd',
				hideZeroBalanceTokens: true
			}
		};

		const wrapper = shallow(<Tokens />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.find('AssetElement').length).toEqual(2);
	});

	it('should show all balance tokens when hideZeroBalanceTokens setting is offs', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AssetsController: {
						tokens: [
							{ symbol: 'ETH', address: '0x0', decimals: 18 },
							{ symbol: 'BAT', address: '0x01', decimals: 18 },
							{ symbol: 'LINK', address: '0x02', decimals: 18 }
						]
					},
					TokenRatesController: {
						contractExchangeRates: {}
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						conversionRate: 1
					},
					TokenBalancesController: {
						contractBalances: {
							'0x0': new BN(0),
							'0x01': new BN(2),
							'0x02': new BN(0)
						}
					},
					NetworkController: {
						provider: { chainId: '1' }
					}
				}
			},
			settings: {
				primaryCurrency: 'usd',
				hideZeroBalanceTokens: true
			}
		};

		const wrapper = shallow(<Tokens />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.find('AssetElement').length).toEqual(3);
	});
});
