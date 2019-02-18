import React from 'react';
import { shallow } from 'enzyme';
import GenericButtonIos from './index.ios';
import GenericButtonAndroid from './index.android';

describe('GenericButton', () => {
	it('should render correctly on iOS', () => {
		const wrapper = shallow(<GenericButtonIos />);
		expect(wrapper).toMatchSnapshot();
	});

	it('should render correctly on android', () => {
		jest.mock('Platform', () => {
			const Platform = require.requireActual('Platform');
			Platform.OS = 'android';
			return Platform;
		});
		const wrapper = shallow(<GenericButtonAndroid />);
		expect(wrapper).toMatchSnapshot();
	});
});
