import React from 'react';
import TransferElement from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('TransferElement', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(
			<TransferElement
				tx={{ transaction: { to: '0x0', from: '0x1', nonce: 1 }, status: 'CONFIRMED' }}
				conversionRate={1}
				currentCurrency={'USD'}
				selectedTx={'0x0'}
				selectedAddress={'0x1'}
				i={1}
				tokens={{}}
				// eslint-disable-next-line react/jsx-no-bind
				renderTxElement={() => ''}
				// eslint-disable-next-line react/jsx-no-bind
				renderTxDetails={() => ''}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
