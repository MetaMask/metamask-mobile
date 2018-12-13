import React from 'react';
import { shallow } from 'enzyme';
import HomePage from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

describe('HomePage', () => {
	it('should render correctly', () => {
		const mockStore = configureMockStore();
		const store = mockStore({});
		const wrapper = shallow(
			<Provider store={store}>
				<HomePage />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
