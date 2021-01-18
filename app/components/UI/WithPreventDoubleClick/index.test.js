import React from 'react';
import { shallow } from 'enzyme';
import WithPreventDoubleClick from './';

describe('WithPreventDoubleClick', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<WithPreventDoubleClick onPress={() => ({})} />);
		expect(wrapper).toMatchSnapshot();
	});
});
