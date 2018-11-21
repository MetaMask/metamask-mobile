import React from 'react';
import { shallow } from 'enzyme';
import AppConfigurations from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AppConfigurations', () => {
	it('should render correctly', () => {
		const initialState = {};
		const wrapper = shallow(<AppConfigurations navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
