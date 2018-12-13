import React from 'react';
import { shallow } from 'enzyme';
import HomePage from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('HomePage', () => {
	it('should render correctly', () => {
		const initialState = {
			bookmarks: [{ url: 'url', name: 'name' }]
		};

		const wrapper = shallow(<HomePage />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
