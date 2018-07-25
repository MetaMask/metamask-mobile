import React from 'react';
import { shallow } from 'enzyme';
import WalletScreen from './';

describe('WalletScreen', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<WalletScreen />);
		expect(wrapper).toMatchSnapshot();
	});
});
