import React from 'react';
import { shallow } from 'enzyme';
import CollectibleOverview from './';

describe('CollectibleOverview', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<CollectibleOverview asset={{ name: 'Leopard', tokenId: 6904, address: '0x123' }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
