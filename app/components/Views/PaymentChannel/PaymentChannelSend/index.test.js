import React from 'react';
import { shallow } from 'enzyme';
import PaymentChannelSend from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('PaymentChannelSend', () => {
	it('should render correctly', () => {
		const initialState = {
			transaction: {}
		};

		const wrapper = shallow(<PaymentChannelSend />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
