/* eslint-disable react/jsx-no-bind */
import React from 'react';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import BackupAlert from './';

const mockStore = configureMockStore();

describe('BackupAlert', () => {
	it('should render correctly', () => {
		const fn = () => null;
		const initialState = {
			user: {
				seedphraseBackedUp: false,
				passwordSet: false
			}
		};

		const wrapper = shallow(<BackupAlert onPress={fn} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
