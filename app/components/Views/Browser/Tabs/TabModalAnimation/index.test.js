jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import TabModalAnimation from './';

describe('TabModalAnimation', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<TabModalAnimation tab={{ image: '' }} position={{ x: 0, y: 0 }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
