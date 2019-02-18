import React from 'react';
import { shallow } from 'enzyme';
import AssetActionButtons from './';

describe('AssetActionButtons', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AssetActionButtons leftText={'leftText'} rightText={'rightText'} />);
		expect(wrapper).toMatchSnapshot();
	});
});
