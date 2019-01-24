import React from 'react';
import { shallow } from 'enzyme';
import CollectibleView from './';

describe('CollectibleView', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<CollectibleView asset={{ name: 'Leopard', tokenId: 6904, address: '0x123' }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
