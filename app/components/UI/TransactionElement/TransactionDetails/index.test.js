import React from 'react';
import TransactionDetails from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TransactionDetails', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					CurrencyRateController: {
						conversionRate: 2,
						currentCurrency: 'USD'
					},
					PreferencesController: {
						frequentRpcList: []
					},
					NetworkController: {
						provider: {
							rpcTarget: '',
							type: ''
						}
					}
				}
			}
		};

		const wrapper = shallow(
			<TransactionDetails
				transactionObject={{
					networkID: '1',
					status: 'confirmed',
					transaction: {
						nonce: ''
					}
				}}
				transactionDetails={{
					renderFrom: '0x0',
					renderTo: '0x1',
					transactionHash: '0x2',
					renderValue: '2 TKN',
					renderGas: '21000',
					renderGasPrice: '2',
					renderTotalValue: '2 TKN / 0.001 ETH',
					renderTotalValueFiat: ''
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
