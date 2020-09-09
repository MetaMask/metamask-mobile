import React from 'react';
import { shallow } from 'enzyme';
import Identicon from './';
import configureMockStore from 'redux-mock-store';

describe('Identicon', () => {
	const mockStore = configureMockStore();
	it('should render correctly when useBlockieIcon is true', () => {
		const initialState = {
			settings: { useBlockieIcon: true }
		};

		const wrapper = shallow(<Identicon />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
	it('should render correctly when useBlockieIcon is false', () => {
		const initialState = {
			settings: { useBlockieIcon: false }
		};

		const wrapper = shallow(<Identicon />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
