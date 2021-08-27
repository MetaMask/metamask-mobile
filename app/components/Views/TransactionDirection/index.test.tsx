import React from 'react';
import { shallow } from 'enzyme';
import TransactionDirection from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	transaction: {},
	engine: {
		backgroundState: {
			PreferencesController: {
				identities: { '0x1': { name: 'Account 1' } }
			}
		}
	}
};
const store = mockStore(initialState);

describe('TransactionDirection', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<TransactionDirection />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
