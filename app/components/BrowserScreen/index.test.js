import React from 'react';
import { shallow } from 'enzyme';
import BrowserScreen from './';

describe('BrowserScreen', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<BrowserScreen />);
		expect(wrapper).toMatchSnapshot();
	});
});
