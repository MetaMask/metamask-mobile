import React from 'react';
import TransactionReviewFeeCard from './';
import { shallow } from 'enzyme';

describe('TransactionReviewFeeCard', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<TransactionReviewFeeCard />);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
