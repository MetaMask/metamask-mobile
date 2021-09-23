import React from 'react';
import { shallow } from 'enzyme';
import SearchTokenAutocomplete from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({
	engine: {
		backgroundState: {
			PreferencesController: {
				useStaticTokenList: true,
			},
		},
	},
});

describe('SearchTokenAutocomplete', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<SearchTokenAutocomplete navigation={{}} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
