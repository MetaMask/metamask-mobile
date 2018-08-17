import React from 'react';
import { shallow } from 'enzyme';
import LockScreen from './';

describe('LockScreen', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<LockScreen />);
		expect(wrapper).toMatchSnapshot();
	});
});
