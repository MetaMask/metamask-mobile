import React from 'react';
import { shallow } from 'enzyme';
import SyncWithExtensionSuccess from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('SyncWithExtensionSuccess', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<SyncWithExtensionSuccess />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
