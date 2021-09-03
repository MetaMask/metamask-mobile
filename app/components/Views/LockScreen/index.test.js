import React from 'react';
import { shallow } from 'enzyme';
import LockScreen from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('LockScreen', () => {
	it('should render correctly', () => {
		const initialState = {
			user: {
				passwordSet: false,
			},
		};

		const wrapper = shallow(<LockScreen />, {
			context: { store: mockStore(initialState) },
		});
		expect(wrapper).toMatchSnapshot();
	});
});
