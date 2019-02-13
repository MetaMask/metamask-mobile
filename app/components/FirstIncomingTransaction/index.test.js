import React from 'react';
import { shallow } from 'enzyme';
import FirstIncomingTransaction from './';

describe('FirstIncomingTransaction', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<FirstIncomingTransaction navigation={{ getParam: () => null, state: { params: {} } }} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
