import React from 'react';
import { shallow } from 'enzyme';
import TransactionReviewDetailsCard from './';
import configureMockStore from 'redux-mock-store';

describe('TransactionReviewDetailsCard', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(
			<TransactionReviewDetailsCard
				address="0xcE25...233a"
				allowance="70000"
				data="0x095ea7b30000000000000000000000009bc5baf874d2da8d216ae9f137804184ee5afef40000000000000000000000000000000000000000000000000000000000011170"
				displayViewData
				host="metamask.github.io"
				method="Approve"
				tokenSymbol="TST"
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper).toMatchSnapshot();
	});
	it('should render correctly if displayViewData is false', () => {
		const initialState = {};

		const wrapper = shallow(
			<TransactionReviewDetailsCard
				address="0xcE25...233a"
				allowance="70000"
				data="0x095ea7b30000000000000000000000009bc5baf874d2da8d216ae9f137804184ee5afef40000000000000000000000000000000000000000000000000000000000011170"
				displayViewData={false}
				host="metamask.github.io"
				method="Approve"
				tokenSymbol="TST"
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper).toMatchSnapshot();
	});
});
