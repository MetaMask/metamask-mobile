import React from 'react';
import { shallow } from 'enzyme';
import PaymentChannelWelcome from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('PaymentChannelWelcome', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {}
			}
		};

		const wrapper = shallow(<PaymentChannelWelcome />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
