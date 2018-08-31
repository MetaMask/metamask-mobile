import React from 'react';
import { shallow } from 'enzyme';
import SearchAsset from './';

describe('SearchAsset', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SearchAsset />);
		expect(wrapper).toMatchSnapshot();
	});
});
