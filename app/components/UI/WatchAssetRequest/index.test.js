import React from 'react';
import { shallow } from 'enzyme';
import WatchAssetRequest from './';
import configureMockStore from 'redux-mock-store';
import { BN } from 'ethereumjs-util';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	engine: {
		backgroundState: {
			TokenBalancesController: {
				contractBalances: { '0x2': new BN(0) }
			}
		}
	}
};
const store = mockStore(initialState);

describe('WatchAssetRequest', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<WatchAssetRequest suggestedAssetMeta={{ asset: { address: '0x2', symbol: 'TKN', decimals: 0 } }} />
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
