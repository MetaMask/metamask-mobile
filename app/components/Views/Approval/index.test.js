import React from 'react';
import Approval from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();
const store = mockStore({});

describe('Approval', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<Approval />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
