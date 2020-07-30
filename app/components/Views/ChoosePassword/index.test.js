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
			},
			engine: {
				backgroundState: {
					PreferencesController: {
						selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1'
					}
				}
			}
		};

		const wrapper = shallow(
			<ChoosePassword
				navigation={{
					getParam: () => ['onboarding', 'protect'],
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
