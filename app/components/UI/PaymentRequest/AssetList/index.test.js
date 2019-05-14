import React from 'react';
import { shallow } from 'enzyme';
import AssetList from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AssetList', () => {
	it('should render correctly', () => {
		const initialState = {};

		const wrapper = shallow(<AssetList emptyMessage={'Enpty Message'} searchResults={[]} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
