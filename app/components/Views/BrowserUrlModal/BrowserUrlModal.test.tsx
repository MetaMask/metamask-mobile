import React from 'react';
import { shallow } from 'enzyme';
import BrowserUrlModal from './';

describe('BrowserUrlModal', () => {
	function mockOnUrlInputSubmit(inputValue: string | undefined) {
		// noop
		console.log(inputValue);
	}
	it('should render correctly', () => {
		const wrapper = shallow(
			<BrowserUrlModal
				route={{
					params: {
						onUrlInputSubmit: mockOnUrlInputSubmit,
						url: 'test',
					},
				}}
			/>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
