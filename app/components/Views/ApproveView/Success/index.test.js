import React from 'react';
import Success from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();

describe('Success', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<Success />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
