import React from 'react';
import { shallow } from 'enzyme';
import ImportFromSeed from './';
import configureMockStore from 'redux-mock-store';

describe('ImportFromSeed', () => {
	const mockStore = configureMockStore();

	it('should render correctly', () => {
		const initialState = {
			user: {
				passwordSet: true,
				seedphraseBackedUp: false
			}
		};

		const wrapper = shallow(<ImportFromSeed route={{ params: {} }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
