import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep5 from './';

describe('AccountBackupStep5', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AccountBackupStep5 visible />);
		expect(wrapper).toMatchSnapshot();
	});
});
