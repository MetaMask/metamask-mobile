import React from 'react';
import { shallow } from 'enzyme';
import FeaturedItem from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('FeaturedItem', () => {
	it('should render correctly', () => {
		const initialState = {};
		const wrapper = shallow(<FeaturedItem name={'name'} url={'url'} description={'description'} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
