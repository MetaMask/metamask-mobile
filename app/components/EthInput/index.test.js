import React from 'react';
import EthInput from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();
const store = mockStore({});

describe('EthInput', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<EthInput />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
