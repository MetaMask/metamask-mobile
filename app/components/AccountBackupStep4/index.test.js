import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep4 from './';

describe('AccountBackupStep4', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AccountBackupStep4 visible />);
		expect(wrapper).toMatchSnapshot();
	});
});
