import React from 'react';
import { shallow } from 'enzyme';
import ImportWallet from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

describe('ImportWallet', () => {
	it('should render correctly', () => {
		const mockStore = configureMockStore();
		const store = mockStore({});
		const wrapper = shallow(
			<Provider store={store}>
				<ImportWallet />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
