import React from 'react';
import { shallow } from 'enzyme';
import Asset from './';

describe('Asset', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Asset />);
		expect(wrapper).toMatchSnapshot();
	});
});
