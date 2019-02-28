import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NavbarRightButton from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('NavbarRightButton', () => {
	it('should render correctly', () => {
		const address = '0xe7E125654064EEa56229f273dA586F10DF96B0a1';

		const wrapper = shallow(
			<Provider store={store}>
				<NavbarRightButton address={address} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
