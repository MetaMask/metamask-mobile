import React from 'react';
import { shallow } from 'enzyme';
import OfflineMode from './';

describe('OfflineMode', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<OfflineMode navigation={{ getParam: () => false }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
