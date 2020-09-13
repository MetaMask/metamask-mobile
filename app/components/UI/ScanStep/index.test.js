import React from 'react';
import { shallow } from 'enzyme';
import ScanStep from './';

describe('ScanStep', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<ScanStep />);
		expect(wrapper).toMatchSnapshot();
	});
});
