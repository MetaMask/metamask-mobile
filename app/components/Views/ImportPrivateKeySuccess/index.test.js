import React from 'react';
import { shallow } from 'enzyme';
import ImportPrivateKeySuccess from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

describe('ImportPrivateKeySuccess', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<ImportPrivateKeySuccess route={{ params: {} }} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
