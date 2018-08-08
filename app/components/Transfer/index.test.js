import React from 'react';
import { shallow } from 'enzyme';
import Transfer from './';

describe('Transfer', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Transfer />);
		expect(wrapper).toMatchSnapshot();
	});
});
