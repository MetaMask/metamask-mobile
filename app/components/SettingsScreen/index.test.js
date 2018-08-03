import React from 'react';
import { shallow } from 'enzyme';
import SettingsScreen from './';

describe('SettingsScreen', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SettingsScreen />);
		expect(wrapper).toMatchSnapshot();
	});
});
