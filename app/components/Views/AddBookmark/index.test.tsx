import React from 'react';
import { shallow } from 'enzyme';
import AddBookmark from './';

describe('AddBookmark', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AddBookmark route={{ params: {} }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
