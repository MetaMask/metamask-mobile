import React from 'react';
import { shallow } from 'enzyme';
import NetworksSettings from './';
import configureMockStore from 'redux-mock-store';
describe('NetworksSettings', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: {
						frequentRpcList: []
					}
				}
			}
		};
		const wrapper = shallow(
			<NetworksSettings
				navigation={{
					state: { params: {} },
					getParam: () => {
						'network';
					}
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
