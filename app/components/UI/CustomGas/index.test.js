jest.useFakeTimers();

import React from 'react';
import CustomGas from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { BN } from 'ethereumjs-util';

const mockStore = configureMockStore();

describe('CustomGas', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					CurrencyRateController: {
						currentCurrency: 'usd',
						conversionRate: 0.1
					},
					AccountTrackerController: {
						accounts: {
							'0x': '0x'
						}
					},
					NetworkController: {
						provider: {
							ticker: 'ETH'
						}
					}
				}
			},
			transaction: {
				from: '0x',
				value: 100
			}
		};

		const wrapper = shallow(<CustomGas navigation={{ state: { params: {} } }} gas={new BN(0)} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
