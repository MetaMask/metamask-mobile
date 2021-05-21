import React from 'react';
import CollectibleModal from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('CollectibleModal', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(
			<CollectibleModal
				navigation={{ state: { params: { address: '0x1' } } }}
				collectible={{ name: 'Leopard', tokenId: 6904, address: '0x123' }}
				contractName={'Opensea'}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
