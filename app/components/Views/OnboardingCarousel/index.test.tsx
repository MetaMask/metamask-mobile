import React from 'react';
import { shallow } from 'enzyme';
import OnboardingCarousel from './';

describe('OnboardingCarousel', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<OnboardingCarousel route={{ params: {} }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
