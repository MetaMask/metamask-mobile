import React from 'react';
import { shallow } from 'enzyme';
import WalletConnectReturnToBrowserModal from './';

describe('WalletConnectReturnToBrowserModal', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<WalletConnectReturnToBrowserModal modalVisible />);
		expect(wrapper).toMatchSnapshot();
	});
});
