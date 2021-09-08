import React from 'react';
import { shallow } from 'enzyme';
import AssetList from './';

describe('AssetList', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AssetList emptyMessage={'Enpty Message'} searchResults={[]} />);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
