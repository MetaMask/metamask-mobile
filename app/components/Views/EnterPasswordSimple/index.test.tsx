jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import EnterPasswordSimple from './';

describe('EnterPasswordSimple', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<EnterPasswordSimple route={{ params: {} }} />, {});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
