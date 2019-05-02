import React from 'react';
import { shallow } from 'enzyme';
import Login from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Login', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<Login />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
