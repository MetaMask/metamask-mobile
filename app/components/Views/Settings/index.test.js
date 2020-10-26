import React from 'react';
import { shallow } from 'enzyme';
import Settings from './';
import configureMockStore from 'redux-mock-store';

describe('Settings', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {
			privacy: { approvedHosts: [], privacyMode: true },
			browser: { history: [] },
			settings: { lockTime: 1000, searchEngine: 'DuckDuckGo', useBlockieIcon: true },
			engine: {
				backgroundState: {
					CurrencyRateController: { currentCurrency: 'USD' },
					NetworkController: {
						provider: {
							type: 'mainnet'
						}
					},
					PreferencesController: { selectedAddress: '0x0' }
				}
			}
		};
		const wrapper = shallow(
			<Settings
				navigation={{
					state: { params: {} }
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
