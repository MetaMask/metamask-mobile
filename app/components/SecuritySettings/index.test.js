import React from 'react';
import { shallow } from 'enzyme';
import SecuritySettings from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('SecuritySettings', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					CurrencyRateController: {
						currentCurrency: 'usd'
					}
				}
			}
		};

		const wrapper = shallow(<SecuritySettings navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
