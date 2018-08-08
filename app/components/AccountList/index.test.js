import React from 'react';
import { shallow } from 'enzyme';
import Accounts from './';

describe('Accounts', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Accounts />);
		expect(wrapper).toMatchSnapshot();
	});
});
