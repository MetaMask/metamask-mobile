import React from 'react';
import { shallow } from 'enzyme';
import NetworkList from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('NetworkList', () => {
	it('should render correctly', () => {
		const initialState = {
			privacy: {
				approvedHosts: {}
			},
			engine: {
				backgroundState: {
					NetworkController: {
						provider: { type: 'mainnet', rpcTarget: 'http://10.0.2.2:8545' }
					},
					PreferencesController: { frequentRpcList: ['http://10.0.2.2:8545'] },
					NetworkStatusController: {
						networkStatus: { infura: { mainnet: 'ok', ropsten: 'ok', kovan: 'ok', rinkeby: 'ok' } }
					}
				}
			}
		};

		const wrapper = shallow(<NetworkList />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
