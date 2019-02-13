import React from 'react';
import AssetOverview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
const mockStore = configureMockStore();

describe('AssetOverview', () => {
	it('should render correctly', () => {
		const initialState = {};
		const asset = {
			balance: 4,
			balanceFiat: 1500,
			logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
			symbol: 'ETH',
			name: 'Ethereum'
		};

		const wrapper = shallow(<AssetOverview asset={asset} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
