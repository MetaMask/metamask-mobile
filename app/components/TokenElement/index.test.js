import React from 'react';
import { shallow } from 'enzyme';
import TokenElement from './';

describe('TokenElement', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<TokenElement asset={{ address: '0x123', symbol: 'ABC', decimals: 18 }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
