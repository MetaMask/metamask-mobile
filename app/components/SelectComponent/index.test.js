import React from 'react';
import { shallow } from 'enzyme';
import SelectComponent from './';

describe('SelectComponent', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SelectComponent />);
		expect(wrapper).toMatchSnapshot();
	});
});
