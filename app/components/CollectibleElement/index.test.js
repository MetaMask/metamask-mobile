import React from 'react';
import { shallow } from 'enzyme';
import CollectibleElement from './';

describe('CollectibleElement', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleElement asset={{ name: 'NAME', image: 'IMAGE', tokenId: 123, address: '0x123' }} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
