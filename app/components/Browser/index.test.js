import React from 'react';
import Web3Webview from 'react-native-web3-webview';
import { TextInput } from 'react-native';
import { shallow } from 'enzyme';
import { Browser } from './';
import HomePage from '../HomePage';

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

	it('should have the back button always enabled', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		expect(wrapper.find('[name="angle-left"]').prop('disabled')).not.toBe(false);
	});

	it('should render the forward button only if canGoForward', () => {
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		expect(wrapper.find('[name="angle-right"]').length).toBe(0);
		wrapper.setState({ canGoForward: true });
		expect(wrapper.find('[name="angle-right"]')).toBeDefined();
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
		wrapper.setState({ entryScriptWeb3: 'let inject=true;' });
		wrapper.find(Web3Webview).simulate('NavigationStateChange', { canGoBack: true });
		wrapper.instance().webview = { current: MockWebView };
		wrapper.find('[name="angle-left"]').simulate('press');
		expect(stub).toBeCalled();
	});

	it('should go forward', () => {
		const MockWebView = { goForward() {} }; // eslint-disable-line no-empty-function
		const stub = spyOn(MockWebView, 'goForward');
		const wrapper = shallow(<Browser defaultURL="https://metamask.io" />);
		wrapper.setState({ canGoForward: true });
		wrapper.instance().webview = { current: MockWebView };
		wrapper.find('[name="angle-right"]').simulate('press');
		expect(stub).toBeCalled();
	});

	it('should render the home page if no defaultURL', () => {
		const wrapper = shallow(<Browser />);
		expect(wrapper.find(HomePage).length).toBe(1);
	});
});
