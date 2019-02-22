import React from 'react';
import { shallow } from 'enzyme';
import BrowserFavorites from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('BrowserFavorites', () => {
	it('should render correctly', () => {
		const initialState = {
			bookmarks: [{ url: 'url', name: 'name' }]
		};

		const wrapper = shallow(<BrowserFavorites />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
