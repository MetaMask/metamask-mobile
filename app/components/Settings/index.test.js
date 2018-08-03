import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Settings from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Settings', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<Settings />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
