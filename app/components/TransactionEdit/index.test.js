import { BN } from 'ethereumjs-util';
import React from 'react';
import TransactionEdit from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TransactionEdit', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					PreferencesController: {
						selectedAddress: '0x2'
					},
					TokenBalancesController: {
						contractBalances: { '0x2': new BN(0) }
					}
				}
			},
			settings: {
				showHexData: true
			},
			transaction: {
				value: '',
				data: '',
				from: '0x1',
				gas: '',
				gasPrice: '',
				to: '0x2',
				selectedAsset: undefined,
				assetType: undefined
			}
		};

		const wrapper = shallow(
			<TransactionEdit
				navigation={{ state: { params: {} } }}
				transactionData={{ amount: 0, gas: new BN(21000), gasPrice: 1, from: '0x0' }}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
