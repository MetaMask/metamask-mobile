import React from 'react';
import { shallow } from 'enzyme';
import Wallet from './';

describe('Wallet', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Wallet />);
		expect(wrapper).toMatchSnapshot();
	});
});
