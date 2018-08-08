import React from 'react';
import { shallow } from 'enzyme';
import Button from './';

describe('Button', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Button />);
		expect(wrapper).toMatchSnapshot();
	});
});
