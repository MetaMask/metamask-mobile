import React from 'react';
import { shallow } from 'enzyme';
import SettingsNotification from './';

describe('SettingsNotification', () => {
	it('should render correctly as warning', () => {
		const wrapper = shallow(<SettingsNotification isWarning>this is a warning</SettingsNotification>);
		expect(wrapper).toMatchSnapshot();
	});

	it('should render correctly as notification', () => {
		const wrapper = shallow(
			<SettingsNotification isWarning isNotification>
				this is a notification
			</SettingsNotification>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
