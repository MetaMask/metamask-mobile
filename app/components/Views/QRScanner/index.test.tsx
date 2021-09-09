import React from 'react';
import { shallow } from 'enzyme';
import QrScanner from './';

describe('QrScanner', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<QrScanner />);
		expect(wrapper).toMatchSnapshot();
	});
});
