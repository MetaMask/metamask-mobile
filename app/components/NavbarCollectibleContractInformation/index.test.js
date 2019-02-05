import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NavbarCollectibleContractInformation from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('NavbarCollectibleContractInformation', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<NavbarCollectibleContractInformation />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
