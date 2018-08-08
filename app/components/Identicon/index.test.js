import React from 'react';
import { shallow } from 'enzyme';
import Identicon from './';

describe('Identicon', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Identicon />);
		expect(wrapper).toMatchSnapshot();
	});
});
