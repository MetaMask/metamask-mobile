import React from 'react';
import { shallow } from 'enzyme';
import { createAppContainer } from 'react-navigation';
import Main from './';

describe('Main', () => {
	it('should render correctly', () => {
		const MainAppContainer = createAppContainer(Main);
		const wrapper = shallow(<MainAppContainer />);
		expect(wrapper).toMatchSnapshot();
	});
});
