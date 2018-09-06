import React from 'react';
import { shallow } from 'enzyme';
import AssetIcon from './';

describe('AssetIcon', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AssetIcon logo={'metamark.svg'} />);
		expect(wrapper).toMatchSnapshot();
	});
});
