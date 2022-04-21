import React from 'react';
import { shallow } from 'enzyme';
import BrowserUrlModal from './';
import { createNavigationProps } from '../../../util/testUtils';
describe('BrowserUrlModal', () => {
	const mockRoute = {
		key: 'test',
		name: 'BrowserUrlModal',
		params: {
			onUrlInputSubmit: mockOnUrlInputSubmit,
			url: 'test',
		},
	};
	function mockOnUrlInputSubmit(_inputValue: string | undefined) {
		// noop
	}

	const mockNavigation = createNavigationProps(mockRoute);
	it('should render correctly', () => {
		const wrapper = shallow(<BrowserUrlModal {...mockNavigation} route={mockRoute} />);
		expect(wrapper).toMatchSnapshot();
	});
});
