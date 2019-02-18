import React from 'react';
import { shallow } from 'enzyme';
import Settings from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Settings', () => {
	it('should render correctly', () => {
		const initialState = {};
		const wrapper = shallow(<Settings navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
