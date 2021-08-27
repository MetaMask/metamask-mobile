import React from 'react';
import { shallow } from 'enzyme';
import UrlAutocomplete from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ROPSTEN } from '../../../constants/network';

const mockStore = configureMockStore();
const store = mockStore({});

describe('UrlAutocomplete', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<UrlAutocomplete network={ROPSTEN} />
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
