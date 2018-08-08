import React from 'react';
import { shallow } from 'enzyme';
import AssetOverview from './';

describe('AssetOverview', () => {
	it('should render correctly', () => {
		const asset = {
			balance: 4,
			balanceFiat: 1500,
			logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
			symbol: 'ETH',
			name: 'Ethereum'
		};

		const wrapper = shallow(<AssetOverview asset={asset} />);
		expect(wrapper).toMatchSnapshot();
	});
});
