import React from 'react';
import AccountInput from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();
const store = mockStore({});

describe('AccountInput', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<AccountInput />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
