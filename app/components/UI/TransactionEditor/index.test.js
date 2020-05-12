import React from 'react';
import TransactionEditor from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { BN } from 'ethereumjs-util';

const mockStore = configureMockStore();

describe('TransactionEditor', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					TokenBalancesController: {
						contractBalances: { '0x2': new BN(0) }
					},
					PreferencesController: {
						selectedAddress: '0x0'
					},
					AssetsController: {
						tokens: [],
						collectibles: []
					},
					NetworkController: {
						provider: {
							type: 'mainnet'
						}
					}
				}
			},
			transaction: {}
		};

		const wrapper = shallow(
			<TransactionEditor
				navigation={{ state: { params: {} } }}
				transaction={{ value: 0, data: '0x0', gas: 0, gasPrice: 1, from: '0x0', to: '0x1' }}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
