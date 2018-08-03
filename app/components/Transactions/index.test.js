import React from 'react';
import { shallow } from 'enzyme';
import Transactions from './';

describe('Transactions', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Transactions />);
		expect(wrapper).toMatchSnapshot();
	});
});
