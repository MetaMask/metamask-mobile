import React from 'react';
import AccountSelect from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();
const store = mockStore({});

describe('AccountSelect', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<AccountSelect />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
