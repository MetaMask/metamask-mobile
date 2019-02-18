import React from 'react';
import { shallow } from 'enzyme';
import Entry from './';

describe('Entry', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Entry navigation={{ state: { params: { address: '0x1' } } }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
