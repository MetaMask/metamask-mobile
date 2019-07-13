/* eslint-disable react/jsx-no-bind */
import React from 'react';
import { shallow } from 'enzyme';
import BackupAlert from './';

describe('BackupAlert', () => {
	it('should render correctly', () => {
		const fn = () => null;

		const wrapper = shallow(<BackupAlert onPress={fn} />);
		expect(wrapper).toMatchSnapshot();
	});
});
