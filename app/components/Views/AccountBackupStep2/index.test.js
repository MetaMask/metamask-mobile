import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep2 from './';

describe('AccountBackupStep2', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AccountBackupStep2 />);
		expect(wrapper).toMatchSnapshot();
	});
});
