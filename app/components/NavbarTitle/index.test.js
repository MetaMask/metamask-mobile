import React from 'react';
import { shallow } from 'enzyme';
import NavbarTitle from './';

describe('NavbarTitle', () => {
	it('should render correctly', () => {
		const title = 'Test';
		const network = {
			name: 'Ethereum Main Network',
			networkId: 1,
			color: '#3cc29e'
		};
		const wrapper = shallow(<NavbarTitle title={title} network={network} />);
		expect(wrapper).toMatchSnapshot();
	});
});
