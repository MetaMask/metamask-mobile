import React from 'react';
import { shallow } from 'enzyme';
import CustomWebviewAndroid from './index.android';
import CustomWebviewIos from './index.ios';

describe('CustomWebview', () => {
	it('should render correctly on iOS', () => {
		const wrapper = shallow(<CustomWebviewIos />);
		expect(wrapper).toMatchSnapshot();
	});

	it('should render correctly on Android', () => {
		jest.mock('Platform', () => {
			const Platform = require.requireActual('Platform');
			Platform.OS = 'android';
			return Platform;
		});
		const wrapper = shallow(<CustomWebviewAndroid />);
		expect(wrapper).toMatchSnapshot();
	});
});
