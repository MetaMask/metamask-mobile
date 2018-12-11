import React from 'react';
import { shallow } from 'enzyme';
import Collectible from './';

describe('Collectible', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Collectible asset={{ name: 'Leopard', tokenId: 6904, address: '0x123' }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
