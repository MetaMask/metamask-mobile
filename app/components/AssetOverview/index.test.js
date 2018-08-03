import React from 'react';
import { shallow } from 'enzyme';
import AssetOverview from './';

describe('AssetOverview', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AssetOverview />);
		expect(wrapper).toMatchSnapshot();
	});
});
