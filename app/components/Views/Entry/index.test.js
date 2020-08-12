import React from 'react';
import { shallow } from 'enzyme';
import Entry from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Entry', () => {
	it('should render correctly', () => {
		const initialState = {
			user: {
				passwordSet: false
			},
			engine: {
				backgroundState: {
					PreferencesController: {}
				}
			}
		};

		const wrapper = shallow(<Entry />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
