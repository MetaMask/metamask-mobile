import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import SyncWithExtension from './';

const mockStore = configureMockStore();
const store = mockStore({});

describe('SyncWithExtension', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<SyncWithExtension transactions={[]} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
