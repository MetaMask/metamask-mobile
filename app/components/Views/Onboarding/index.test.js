import React from 'react';
import { shallow } from 'enzyme';
import Onboarding from './';

describe('Onboarding', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Onboarding />);
		expect(wrapper).toMatchSnapshot();
	});
});
