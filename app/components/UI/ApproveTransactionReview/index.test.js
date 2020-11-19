import React from 'react';
import { shallow } from 'enzyme';
import ApproveTransactionModal from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('ApproveTransactionModal', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					CurrencyRateController: {
						conversionRate: 5
					},
					NetworkController: {
						provider: {
							ticker: 'ETH',
							type: 'ETH'
						}
					},
					AssetsController: {
						tokens: []
					}
				}
			},
			transaction: {},
			settings: {
				primaryCurrency: 'fiat'
			},
			browser: {
				activeTab: 1605778647042,
				tabs: [{ id: 1605778647042, url: 'https://metamask.github.io/test-dapp/' }]
			}
		};
		const wrapper = shallow(<ApproveTransactionModal />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
