import React from 'react';
import { shallow } from 'enzyme';
import CreateWallet from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('CreateWallet', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<CreateWallet />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
