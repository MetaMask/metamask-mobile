import React from 'react';
import CollectibleContractOverview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	engine: {
		backgroundState: {
			CollectiblesController: {
				collectibles: [],
			},
		},
	},
};
const store = mockStore(initialState);

describe('CollectibleContractOverview', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<CollectibleContractOverview
					collectibleContract={{
						name: 'name',
						symbol: 'symbol',
						description: 'description',
						address: '0x123',
						totalSupply: 1,
					}}
				/>
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
