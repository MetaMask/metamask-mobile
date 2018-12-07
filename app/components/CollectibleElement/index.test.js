import React from 'react';
import { shallow } from 'enzyme';
import CollectibleElement from './';

describe('CollectibleElement', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleElement
				asset={{
					name: 'NAME',
					image: 'IMAGE',
					tokenId: 123,
					address: '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'
				}}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
