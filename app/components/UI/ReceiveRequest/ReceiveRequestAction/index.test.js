import React from 'react';
import { shallow } from 'enzyme';
import ReceiveRequestAction from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe.only('ReceiveRequestAction', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<ReceiveRequestAction actionTitle={'Title'} actionDescription={'Description'} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
