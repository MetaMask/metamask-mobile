import React from 'react';
import { shallow } from 'enzyme';
import TransactionReviewData from './';

describe('TransactionReviewData', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<TransactionReviewData transactionData={{ amount: 0, gas: 0, gasPrice: 1, from: '0x0' }} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
