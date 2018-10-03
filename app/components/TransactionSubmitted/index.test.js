import React from 'react';
import { shallow } from 'enzyme';
import TransactionSubmitted from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('TransactionSubmitted', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<TransactionSubmitted network={'ropsten'} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
