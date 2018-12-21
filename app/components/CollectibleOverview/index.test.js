import React from 'react';
import { shallow } from 'enzyme';
import CollectibleOverview from './';

describe('CollectibleOverview', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleOverview
				collectible={{ name: 'Leopard', tokenId: 6904, address: '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d' }}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
