import React from 'react';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import TransactionNotification from './';

const mockStore = configureMockStore();
const noob = () => console.log('noob');

describe('TransactionElement', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<TransactionNotification status="" transaction={{}} onPress={noob} onHide={noob} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
