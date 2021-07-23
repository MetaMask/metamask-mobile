jest.useFakeTimers();

import React from 'react';
import CustomGas from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { BN } from 'ethereumjs-util';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const generateTransform = jest.fn();
const initialState = {
	engine: {
		backgroundState: {
			CurrencyRateController: {
				currentCurrency: 'usd',
				conversionRate: 0.1
			},
			AccountTrackerController: {
				accounts: {
					'0x': '0x'
				}
			},
			NetworkController: {
				provider: {
					ticker: 'ETH',
					chainId: '1'
				}
			}
		}
	},
	transaction: {
		from: '0x',
		value: 100
	},
	customGasPriceBN: 10
};
const store = mockStore(initialState);

describe('CustomGas', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<CustomGas
					route={{ params: {} }}
					basicGasEstimates={{ averageGwei: 10, fastGwei: 10, safeLowGwei: 10 }}
					generateTransform={generateTransform}
					gas={new BN(0)}
					gasPrice={new BN(0)}
					warningGasPriceHigh=""
				/>
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
