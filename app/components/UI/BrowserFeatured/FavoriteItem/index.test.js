import React from 'react';
import { shallow } from 'enzyme';
import FavoriteItem from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('FavoriteItem', () => {
	it('should render correctly', () => {
		const initialState = {};
		const wrapper = shallow(<FavoriteItem name={'name'} url={'url'} description={'description'} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
