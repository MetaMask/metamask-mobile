import React from 'react';
import { shallow } from 'enzyme';
import SeedWords from './';

describe('SeedWords', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SeedWords />);
		expect(wrapper).toMatchSnapshot();
	});
});
