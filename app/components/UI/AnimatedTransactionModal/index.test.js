import React from 'react';
import { shallow } from 'enzyme';
import AnimatedTransactionModal from './';

describe('AnimatedTransactionModal', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AnimatedTransactionModal />);
		expect(wrapper).toMatchSnapshot();
	});
});
