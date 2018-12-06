import React from 'react';
import { shallow } from 'enzyme';
import CollectibleImage from './';

describe('CollectibleImage', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleImage collectible={{ name: 'NAME', image: 'IMAGE', tokenId: 123, address: '0x123' }} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
