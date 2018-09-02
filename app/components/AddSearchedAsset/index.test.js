import React from 'react';
import { shallow } from 'enzyme';
import AddSearchedAsset from './';

describe('AddSearchedAsset', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AddSearchedAsset />);
		expect(wrapper).toMatchSnapshot();
	});
});
