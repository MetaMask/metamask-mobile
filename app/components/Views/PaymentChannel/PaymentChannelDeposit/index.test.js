import React from 'react';
import { shallow } from 'enzyme';
import PaymentChannelDeposit from './';
import configureMockStore from 'redux-mock-store';
import { ROPSTEN } from '../../../../constants/network';

const mockStore = configureMockStore();

describe('PaymentChannelDeposit', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					CurrencyRateController: {
						currentCurrency: 'USD',
						nativeCurrency: 'ETH',
						conversionRate: 100
					},
					PreferencesController: {
						selectedAddress: '0x1',
						identities: { '0x1': { name: 'Account 1' } }
					},
					NetworkController: {
						provider: {
							type: ROPSTEN,
							ticker: 'ETH'
						}
					}
				}
			},
			settings: {
				primaryCurrency: 'usd'
			}
		};

		const wrapper = shallow(<PaymentChannelDeposit />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
