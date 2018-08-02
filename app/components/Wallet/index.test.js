import React from 'react';
import { shallow } from 'enzyme';
import Wallet from './';

const MOCK_ENGINE = {
	datamodel: {
		state: {
			blockHistory: { recentBlocks: [{ number: 1 }] },
			currencyRate: { conversionRate: 0 },
			network: { provider: { type: 'foo' } },
			networkStatus: { networkStatus: { infura: { foo: 'ok' } } }
		},
		subscribe: () => {
			/* eslint-disable-line no-empty-function */
		}
	}
};

describe('Wallet', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Wallet engine={MOCK_ENGINE} />);
		expect(wrapper).toMatchSnapshot();
	});
});
