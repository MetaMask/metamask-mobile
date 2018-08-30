import React from 'react';
import { shallow } from 'enzyme';
import AddCustomAsset from './';

describe('AddCustomAsset', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AddCustomAsset />);
		expect(wrapper).toMatchSnapshot();
	});
});
