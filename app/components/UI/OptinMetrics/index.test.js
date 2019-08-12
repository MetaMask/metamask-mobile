import React from 'react';
import OptinMetrics from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('OptinMetrics', () => {
	it('should render correctly', () => {
		const initialState = {
			onboarding: {
				event: 'event'
			}
		};

		const wrapper = shallow(<OptinMetrics />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
