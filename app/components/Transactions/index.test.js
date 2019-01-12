import React from 'react';
import Transactions from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('Transactions', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AssetsController: {
						tokens: []
					},
					TokenRatesController: {
						contractExchangeRates: {}
					}
				}
			}
		};

		const wrapper = shallow(<Transactions transactions={[]} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
