import React from 'react';
import { shallow } from 'enzyme';
import AppSettings from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AppSettings', () => {
	it('should render correctly', () => {
		const initialState = {
			privacy: {
				approvedHosts: {}
			},
			settings: {
				searchEngine: 'DuckDuckGo',
				lockTime: 30000
			},
			engine: {
				backgroundState: {
					CurrencyRateController: {
						currentCurrency: 'usd'
					}
				}
			},
			browser: {
				history: []
			}
		};

		const wrapper = shallow(<AppSettings navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
