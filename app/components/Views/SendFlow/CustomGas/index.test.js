import React from 'react';
import { shallow } from 'enzyme';
import CustomGas from './';
import configureMockStore from 'redux-mock-store';

describe('CustomGas', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					NetworkController: {
						provider: {
							ticker: 'ETH'
						}
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						conversionRate: 1
					}
				}
			}
		};
		const wrapper = shallow(<CustomGas />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
