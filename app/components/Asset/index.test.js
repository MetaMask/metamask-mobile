import React from 'react';
import { shallow } from 'enzyme';
import Asset from './';

describe('Asset', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Asset navigation={{ state: { params: {} } }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
