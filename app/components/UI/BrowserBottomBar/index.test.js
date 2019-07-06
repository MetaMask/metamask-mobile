/* eslint-disable react/jsx-no-bind */
import React from 'react';
import { shallow } from 'enzyme';
import BrowserBottomBar from './';

describe('BrowserBottomBar', () => {
	it('should render correctly', () => {
		const fn = () => null;

		const wrapper = shallow(
			<BrowserBottomBar
				canGoBack
				canGoForward={false}
				showTabs={fn}
				toggleOptions={fn}
				showUrlModal={fn}
				goBack={fn}
				goForward={fn}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
