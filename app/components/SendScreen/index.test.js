import React from 'react';
import { shallow } from 'enzyme';
import SendScreen from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Accounts', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<SendScreen />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
