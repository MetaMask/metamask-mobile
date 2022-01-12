jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import ChoosePasswordSimple from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	user: {
		passwordSet: true,
		seedphraseBackedUp: false,
	},
};
const store = mockStore(initialState);

describe('ChoosePasswordSimple', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<ChoosePasswordSimple route={{ params: {} }} />
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
