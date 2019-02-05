import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep3 from './';

describe('AccountBackupStep3', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AccountBackupStep3 />);
		expect(wrapper).toMatchSnapshot();
	});
});
