import React from 'react';
import BrowserHome from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();
const store = mockStore({});

describe('BrowserHome', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<BrowserHome />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
