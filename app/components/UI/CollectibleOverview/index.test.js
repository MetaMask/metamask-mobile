import React from 'react';
import CollectibleOverview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('CollectibleOverview', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(
			<CollectibleOverview
				collectible={{ name: 'Leopard', tokenId: 6904, address: '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d' }}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
