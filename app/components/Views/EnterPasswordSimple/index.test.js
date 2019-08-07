jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import EnterPasswordSimple from './';

describe('EnterPasswordSimple', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<EnterPasswordSimple
				navigation={{
					state: { params: {} }
				}}
			/>,
			{}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
