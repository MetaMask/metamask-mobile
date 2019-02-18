import React from 'react';
import { shallow } from 'enzyme';
import Tokens from './';

describe('Tokens', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Tokens />);
		expect(wrapper).toMatchSnapshot();
	});
});
