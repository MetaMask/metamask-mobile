import React from 'react';
import TransactionReviewFeeCard from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('TransactionReviewFeeCard', () => {
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
							chainId: '1'
						}
					}
				}
			}
		};

		const wrapper = shallow(<TransactionReviewFeeCard />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
