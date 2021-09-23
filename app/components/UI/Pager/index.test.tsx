import React from 'react';
import { shallow } from 'enzyme';
import Pager from './';

describe('Pager', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Pager />);
		expect(wrapper).toMatchSnapshot();
	});
});
