import React from 'react';
import { shallow } from 'enzyme';
import FirstIncomingTransaction from './';

describe('FirstIncomingTransaction', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<FirstIncomingTransaction visible />);
		expect(wrapper).toMatchSnapshot();
	});
});
