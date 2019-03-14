import React from 'react';
import AccountBackupStep6 from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
const mockStore = configureMockStore();

describe('AccountBackupStep6', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<AccountBackupStep6 />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
