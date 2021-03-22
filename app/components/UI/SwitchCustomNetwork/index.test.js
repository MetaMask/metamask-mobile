import React from 'react';
import SwitchCustomNetwork from './';
import { shallow } from 'enzyme';

describe('SwitchCustomNetwork', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SwitchCustomNetwork customNetworkInformation={{}} />);
		expect(wrapper).toMatchSnapshot();
	});
});
