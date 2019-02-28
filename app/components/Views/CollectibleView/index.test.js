import React from 'react';
import CollectibleView from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('CollectibleView', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(
			<CollectibleView
				navigation={{ state: { params: { address: '0x1' } } }}
				asset={{ name: 'Leopard', tokenId: 6904, address: '0x123' }}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
