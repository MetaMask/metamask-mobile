import React from 'react';
import { shallow } from 'enzyme';
import AppInformation from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AppInformation', () => {
	it('should render correctly', () => {
		const initialState = {};
		const wrapper = shallow(<AppInformation navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
