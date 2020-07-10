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
					NetworkController: {
						provider: { type: 'mainnet', rpcTarget: 'http://10.0.2.2:8545' }
					},
					PreferencesController: { frequentRpcList: ['http://10.0.2.2:8545'] }
				}
			},
			privacy: {
				thirdPartyApiMode: true
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
