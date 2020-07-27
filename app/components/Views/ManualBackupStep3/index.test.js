import React from 'react';
import ManualBackupStep3 from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
const mockStore = configureMockStore();

describe('ManualBackupStep3', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<ManualBackupStep3 />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
