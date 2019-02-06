import React from 'react';
import { shallow } from 'enzyme';
import CreateWallet from './';

describe('CreateWallet', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<CreateWallet />);
		expect(wrapper).toMatchSnapshot();
	});
});
