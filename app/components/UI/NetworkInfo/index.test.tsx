import React from 'react';
import { shallow } from 'enzyme';
import NetworkInfo from './';

describe('NetworkInfo', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<NetworkInfo />);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
