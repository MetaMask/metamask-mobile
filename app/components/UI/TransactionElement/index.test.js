import React from 'react';
import TransactionElement from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TransactionElement', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					CurrencyRateController: {
						currentCurrency: 'usd',
						conversionRate: 0.1
					},
					NetworkController: {
						provider: {
							ticker: 'ETH',
							type: 'mainnet'
						}
					}
				}
			}
		};

		const wrapper = shallow(
			<TransactionElement
				tx={{ transaction: { to: '0x0', from: '0x1', nonce: 1 }, status: 'CONFIRMED' }}
				conversionRate={1}
				currentCurrency={'USD'}
				selectedTx={'0x0'}
				selectedAddress={'0x1'}
				i={1}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
