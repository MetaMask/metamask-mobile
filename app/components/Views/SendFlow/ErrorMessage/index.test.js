import React from 'react';
import { shallow } from 'enzyme';
import ErrorMessage from './';
import configureMockStore from 'redux-mock-store';

describe('ErrorMessage', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<ErrorMessage errorMessage={'error'} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
