import React from 'react';
import { shallow } from 'enzyme';
import ProtectYourAccount from './';

describe('ProtectYourAccount', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<ProtectYourAccount />);
		expect(wrapper).toMatchSnapshot();
	});
});
