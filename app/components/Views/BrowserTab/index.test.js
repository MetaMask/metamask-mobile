jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import { BrowserTab } from './';

describe('Browser', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<BrowserTab initialUrl="https://metamask.io" />);
		expect(wrapper).toMatchSnapshot();
	});
});
