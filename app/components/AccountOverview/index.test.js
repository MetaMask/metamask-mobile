import React from 'react';
import { shallow } from 'enzyme';
import AccountOverview from './';

describe('AccountOverview', () => {
	it('should render correctly', () => {
		const account = {
			address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1',
			balanceFiat: 1604.2,
			label: 'Account 1'
		};

		const wrapper = shallow(<AccountOverview account={account} />);
		expect(wrapper).toMatchSnapshot();
	});
});
