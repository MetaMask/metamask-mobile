jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import ChoosePassword from './';
import configureMockStore from 'redux-mock-store';

describe('ChoosePassword', () => {
	const mockStore = configureMockStore();

	it('should render correctly', () => {
		const initialState = {
			user: {
				passwordSet: true,
				seedphraseBackedUp: false
			}
		};

		const wrapper = shallow(
			<ChoosePassword
				navigation={{
					state: { params: {} }
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
