import React from 'react';
import { shallow } from 'enzyme';
import ExtensionSync from './';

describe('ExtensionSync', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<ExtensionSync />);
		expect(wrapper).toMatchSnapshot();
	});
});
