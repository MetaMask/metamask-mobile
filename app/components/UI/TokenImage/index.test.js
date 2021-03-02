import React from 'react';
import { shallow } from 'enzyme';
import TokenImage from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('TokenImage', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					SwapsController: {
						tokens: []
					}
				}
			},
			settings: {
				primaryCurrency: 'usd'
			}
		};
		const wrapper = shallow(<TokenImage asset={{ address: '0x123', symbol: 'ABC', decimals: 18 }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
