import React from 'react';
import { shallow } from 'enzyme';
import Settings from './';

describe('Settings', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Settings />);
		expect(wrapper).toMatchSnapshot();
	});
});
