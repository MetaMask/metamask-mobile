import React from 'react';
import { shallow } from 'enzyme';
import TokenImage from './';

describe('TokenImage', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<TokenImage asset={{ address: '0x123', symbol: 'ABC', decimals: 18 }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
