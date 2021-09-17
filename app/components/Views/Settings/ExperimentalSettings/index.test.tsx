import React from 'react';
import { shallow } from 'enzyme';
import ExperimentalSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	engine: {
		backgroundState: {
			PreferencesController: { useStaticTokenList: true },
		},
	},
};
const store = mockStore(initialState);

describe('ExperimentalSettings', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<ExperimentalSettings navigation={{}} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
