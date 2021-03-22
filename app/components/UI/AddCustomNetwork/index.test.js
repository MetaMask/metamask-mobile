import React from 'react';
import AddCustomNetwork from './';
import { shallow } from 'enzyme';

describe('AddCustomNetwork', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AddCustomNetwork />);
		expect(wrapper).toMatchSnapshot();
	});
});
