import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep1 from './';

describe('AccountBackupStep1', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AccountBackupStep1 />);
		expect(wrapper).toMatchSnapshot();
	});
});
