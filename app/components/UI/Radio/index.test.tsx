import React from 'react';
import { shallow } from 'enzyme';
import Radio from './';

describe('Radio', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Radio />);
		expect(wrapper).toMatchSnapshot();
	});
	it('should render correctly when selected', () => {
		const wrapper = shallow(<Radio selected />);
		expect(wrapper).toMatchSnapshot();
	});
});
