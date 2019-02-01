import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep6 from './';

describe('AccountBackupStep6', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AccountBackupStep6 visible />);
		expect(wrapper).toMatchSnapshot();
	});
});
