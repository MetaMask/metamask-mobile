import React from 'react';
import { shallow } from 'enzyme';
import AssetSearch from './';

describe('AssetSearch', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AssetSearch />);
		expect(wrapper).toMatchSnapshot();
	});
});
