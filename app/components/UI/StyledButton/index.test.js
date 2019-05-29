import React from 'react';
import { shallow } from 'enzyme';
import StyledButton from './index';

describe('StyledButton', () => {
	const buttonTypes = ['default', 'primary', 'secondary', 'danger'];

	buttonTypes.forEach(type => {
		it(`should render correctly on iOS the button with type ${type}`, () => {
			const wrapper = shallow(<StyledButton type={type} />);
			expect(wrapper).toMatchSnapshot();
		});
	});
});
