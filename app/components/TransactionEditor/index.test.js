import React from 'react';
import TransactionEditor from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';

const mockStore = configureMockStore();
const store = mockStore({});

describe('TransactionEditor', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<TransactionEditor />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
