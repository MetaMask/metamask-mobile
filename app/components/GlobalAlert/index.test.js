import React from 'react';
import { shallow } from 'enzyme';
import { Text } from 'react-native';
import GlobalAlert from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('GlobalAlert', () => {
	it('should render correctly', () => {
		const initialState = {
			alert: { isVisible: true, autodismiss: 300, children: <Text>Lol</Text> }
		};

		const wrapper = shallow(<GlobalAlert />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
