import React from 'react';
import { shallow } from 'enzyme';
import TransferScreen from './';

describe('TransferScreen', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<TransferScreen />);
		expect(wrapper).toMatchSnapshot();
	});
});
