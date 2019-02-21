import React from 'react';
import { shallow } from 'enzyme';
import BrowserFeatured from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('BrowserFeatured', () => {
	it('should render correctly', () => {
		const initialState = {};
		const wrapper = shallow(<BrowserFeatured />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
