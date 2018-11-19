import React from 'react';
import CustomGas from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('CustomGas', () => {
	it('should render correctly', () => {
		const initialState = {
			backgroundState: {
				CurrencyRateController: {
					currentCurrency: 'usd',
					conversionRate: 0.1
				}
			}
		};

		const wrapper = shallow(<CustomGas navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
