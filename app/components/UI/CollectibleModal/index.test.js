import React from 'react';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import CollectibleModal from './index';

const mockStore = configureMockStore();

describe('CollectibleModal', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(
			<CollectibleModal
				navigation={{}}
				route={{
					params: {
						contractName: 'Opensea',
						collectible: { name: 'Leopard', tokenId: 6904, address: '0x123' }
					}
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper).toMatchSnapshot();
	});
});
