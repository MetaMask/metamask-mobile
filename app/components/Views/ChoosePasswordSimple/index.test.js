jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import ChoosePasswordSimple from './';
import configureMockStore from 'redux-mock-store';

describe('ChoosePasswordSimple', () => {
	const mockStore = configureMockStore();

	it('should render correctly', () => {
		const initialState = {
			user: {
				passwordSet: true,
				seedphraseBackedUp: false
			}
		};

		const wrapper = shallow(
			<ChoosePasswordSimple
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
