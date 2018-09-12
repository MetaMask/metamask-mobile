import React from 'react';
import { shallow } from 'enzyme';
import AddCustomCollectible from './';

describe('AddCustomCollectible', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AddCustomCollectible />);
		expect(wrapper).toMatchSnapshot();
	});
});
