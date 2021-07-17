import React from 'react';
import TabCountIcon from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
	browser: {
		tabs: [{ url: 'https://metamask.io' }]
	}
};
const store = mockStore(initialState);

describe('TabCountIcon', () => {
	it('should render correctly', () => {
		const onPress = () => null;

		// eslint-disable-next-line react/jsx-no-bind
		const wrapper = shallow(
			<Provider store={store}>
				<TabCountIcon onPress={onPress} />
			</Provider>
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
