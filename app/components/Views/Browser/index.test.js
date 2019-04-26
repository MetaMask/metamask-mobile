jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import { Browser } from './';

describe('Browser', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Browser
				url="https://metamask.io"
				tabs={[]}
				navigation={{
					getParam: () => ({ showTabs: false })
				}}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
