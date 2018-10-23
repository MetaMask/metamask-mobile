import React from 'react';
import { shallow } from 'enzyme';
import SyncWIthExtensionSuccess from './';

describe('SyncWIthExtensionSuccess', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SyncWIthExtensionSuccess />);
		expect(wrapper).toMatchSnapshot();
	});
});
