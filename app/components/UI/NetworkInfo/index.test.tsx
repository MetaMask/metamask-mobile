import React from 'react';
import { shallow } from 'enzyme';
import NetworkInfo from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	privacy: {
		approvedHosts: {},
	},
	engine: {
		backgroundState: {
			NetworkController: {
				provider: { type: 'mainnet', rpcTarget: 'http://10.0.2.2:8545' },
			},
			PreferencesController: { frequentRpcList: ['http://10.0.2.2:8545'] },
		},
	},
	networkOnboarded: {
		networkOnboardedState: [{ network: 'mainnet', onboarded: true }],
	},
};
const store = mockStore(initialState);

describe('NetworkInfo', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<NetworkInfo
					type={''}
					onClose={function (): void {
						throw new Error('Function not implemented.');
					}}
					ticker={''}
				/>
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
