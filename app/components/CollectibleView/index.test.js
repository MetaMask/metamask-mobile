import React from 'react';
import { shallow } from 'enzyme';
import CollectibleView from './';

describe('CollectibleView', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleView
				navigation={{ state: { params: { address: '0x1' } } }}
				asset={{ name: 'Leopard', tokenId: 6904, address: '0x123' }}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
