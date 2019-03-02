import React from 'react';
import { shallow } from 'enzyme';
import SimpleWebview from './';

describe('SimpleWebview', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<SimpleWebview navigation={{ getParam: () => ({ url: 'https://etherscan.io', title: 'etherscan' }) }} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
