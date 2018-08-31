import React from 'react';
import { shallow } from 'enzyme';
import AddAsset from './';

describe('AddAsset', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AddAsset />);
		expect(wrapper).toMatchSnapshot();
	});
});
