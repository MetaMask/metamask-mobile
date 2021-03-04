import React from 'react';
import { shallow } from 'enzyme';
import IncrementDecrementSvg from './';

describe('CustomNonceModal', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<IncrementDecrementSvg />);
		expect(wrapper).toMatchSnapshot();
	});
});
