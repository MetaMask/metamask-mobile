jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import { Browser } from './';

describe('Browser', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Browser url="https://metamask.io" />);
		expect(wrapper).toMatchSnapshot();
	});

	it('should have the back button always enabled', () => {
		const wrapper = shallow(<Browser url="https://metamask.io" />);
		expect(wrapper.find('[name="angle-left"]').prop('disabled')).not.toBe(false);
	});

	it('should render the forward button enabled if canGoForward', () => {
		const wrapper = shallow(<Browser url="https://metamask.io" />);
		expect(wrapper.find('[name="angle-right"]').length).toBe(1);
		expect(wrapper.find('[name="angle-right"]').prop('disabled')).toBe(true);
		wrapper.setState({ forwardEnabled: true });
		expect(wrapper.find('[name="angle-right"]').prop('disabled')).toBe(false);
	});

	it('should go back', () => {
		const MockWebView = { goBack() {} }; // eslint-disable-line no-empty-function
		const stub = spyOn(MockWebView, 'goBack');
		const wrapper = shallow(<Browser url="https://metamask.io" />);
		wrapper.instance().initialUrl = 'https://metamask.io';
		wrapper.setState({ entryScriptWeb3: 'let inject=true;', inputValue: 'https://consensys.net' });
		wrapper.instance().webview = { current: MockWebView };
		wrapper.find('[name="angle-left"]').simulate('press');
		expect(stub).toBeCalled();
	});

	it('should go forward', () => {
		const MockWebView = { goForward() {} }; // eslint-disable-line no-empty-function
		const stub = spyOn(MockWebView, 'goForward');
		const wrapper = shallow(<Browser url="https://metamask.io" />);
		wrapper.setState({ forwardEnabled: true });
		wrapper.instance().webview = { current: MockWebView };
		wrapper.find('[name="angle-right"]').simulate('press');
		expect(stub).toBeCalled();
	});
});
