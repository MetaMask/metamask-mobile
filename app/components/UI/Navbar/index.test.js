import React from 'react';
import { shallow } from 'enzyme';
import NavBar from './';

describe('NavBar', () => {
	it('should render correctly', () => {
		const title = 'Test';

		const wrapper = shallow(<NavBar title={title} />);
		expect(wrapper).toMatchSnapshot();
	});
});
