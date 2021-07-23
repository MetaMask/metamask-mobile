import React from 'react';
import { shallow } from 'enzyme';
import AssetList from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const store = mockStore({});

describe('AssetList', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<AssetList emptyMessage={'Enpty Message'} searchResults={[]} />
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
