import React from 'react';
import { shallow } from 'enzyme';
import BrowserHome from './';

describe('BrowserHome', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<BrowserHome />);
		expect(wrapper).toMatchSnapshot();
	});
});
