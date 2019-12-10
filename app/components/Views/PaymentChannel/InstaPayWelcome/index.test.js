import React from 'react';
import { shallow } from 'enzyme';
import InstaPayWelcome from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('InstaPayWelcome', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {}
			}
		};

		const wrapper = shallow(<InstaPayWelcome />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
