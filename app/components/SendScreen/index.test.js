import React from 'react';
import { shallow } from 'enzyme';
import SendScreen from './';

describe('SendScreen', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SendScreen />);
		expect(wrapper).toMatchSnapshot();
	});
});
