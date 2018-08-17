import React from 'react';
import { shallow } from 'enzyme';
import CreatePassword from './';

describe('CreatePassword', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<CreatePassword />);
		expect(wrapper).toMatchSnapshot();
	});
});
