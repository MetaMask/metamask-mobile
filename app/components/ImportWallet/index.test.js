import React from 'react';
import { shallow } from 'enzyme';
import ImportFromSeed from './';

describe('ImportFromSeed', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<ImportFromSeed />);
		expect(wrapper).toMatchSnapshot();
	});
});
