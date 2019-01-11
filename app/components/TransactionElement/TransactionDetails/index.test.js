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
					}
				}
			}
		};

		const wrapper = shallow(
			<TransactionDetails
				transactionObject={{
					transaction: { transactionHash: '0x1', gas: '', gasPrice: '', value: '', to: '', from: '' },
					networkID: '1'
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
