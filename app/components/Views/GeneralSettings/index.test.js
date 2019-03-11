import React from 'react';
import { shallow } from 'enzyme';
import GeneralSettings from './';
import configureMockStore from 'redux-mock-store';
describe('GeneralSettings', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {
			privacy: { approvedHosts: [], privacyMode: true },
			browser: { history: [] },
			settings: { lockTime: 1000, searchEngine: 'DuckDuckGo' },
			engine: {
				backgroundState: {
					CurrencyRateController: { currentCurrency: 'USD' },
					NetworkController: {
						provider: {
							type: 'mainnet'
						}
					}
				}
			}
		};
		const wrapper = shallow(
			<GeneralSettings
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
