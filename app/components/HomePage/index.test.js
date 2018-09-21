import React from 'react';
import { shallow } from 'enzyme';
import HomePage from './';

describe('HomePage', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<HomePage bookmarks={[]} />);
		expect(wrapper).toMatchSnapshot();
	});
});
