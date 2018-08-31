import React from 'react';
import WKWebView from 'react-native-wkwebview-reborn';
import { TextInput } from 'react-native';
import { shallow } from 'enzyme';
import { Browser } from './';

describe('Browser', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		expect(wrapper).toMatchSnapshot();
	});

	it('should update input value', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		wrapper.find(TextInput).simulate('ChangeText', 'foobar');
		expect(wrapper.state().inputValue).toBe('foobar');
	});

	it('should enable back button', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		expect(wrapper.find('[name="angle-left"]').prop('disabled')).toBe(true);
		wrapper.find(WKWebView).simulate('NavigationStateChange', { canGoBack: true });
		expect(wrapper.find('[name="angle-left"]').prop('disabled')).toBe(false);
	});

	it('should enable forward button', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		expect(wrapper.find('[name="angle-right"]').prop('disabled')).toBe(true);
		wrapper.find(WKWebView).simulate('NavigationStateChange', { canGoForward: true });
		expect(wrapper.find('[name="angle-right"]').prop('disabled')).toBe(false);
	});

	it('should go', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		wrapper.setState({ inputValue: 'https://foobar' });
		wrapper.find(TextInput).simulate('SubmitEditing');
		expect(wrapper.state().url).toBe('https://foobar');
	});

	it('should add protocol', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		wrapper.setState({ inputValue: 'foobar' });
		wrapper.find(TextInput).simulate('SubmitEditing');
		expect(wrapper.state().url).toBe('https://foobar');
	});

	it('should go back', () => {
		const MockWebView = { goBack() {} }; // eslint-disable-line no-empty-function
		const stub = spyOn(MockWebView, 'goBack');
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		wrapper.find(WKWebView).simulate('NavigationStateChange', { canGoBack: true });
		wrapper.instance().webview = { current: MockWebView };
		wrapper.find('[name="angle-left"]').simulate('press');
		expect(stub).toBeCalled();
	});

	it('should go forward', () => {
		const MockWebView = { goForward() {} }; // eslint-disable-line no-empty-function
		const stub = spyOn(MockWebView, 'goForward');
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		wrapper.find(WKWebView).simulate('NavigationStateChange', { canGoBack: true });
		wrapper.instance().webview = { current: MockWebView };
		wrapper.find('[name="angle-right"]').simulate('press');
		expect(stub).toBeCalled();
	});

	it('should reload', () => {
		const MockWebView = { reload() {} }; // eslint-disable-line no-empty-function
		const stub = spyOn(MockWebView, 'reload');
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		wrapper.find(WKWebView).simulate('NavigationStateChange', {});
		wrapper.instance().webview = { current: MockWebView };
		wrapper.find('[name="refresh"]').simulate('press');
		expect(stub).toBeCalled();
	});
});
