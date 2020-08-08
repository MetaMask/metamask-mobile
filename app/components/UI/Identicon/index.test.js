import React from 'react';
import { shallow } from 'enzyme';
import Identicon from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Identicon', () => {
	it('should render correctly', () => {
		const initialState = {
			settings: { useBlockieIcon: false }
		};

		const wrapper = shallow(<Identicon />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
