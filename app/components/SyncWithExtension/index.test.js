import React from 'react';
import { shallow } from 'enzyme';
import SyncWithExtension from './';

describe('SyncWithExtension', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SyncWithExtension />);
		expect(wrapper).toMatchSnapshot();
	});
});
