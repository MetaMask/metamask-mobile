import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import OfflineMode from './';

const mockStore = configureMockStore();

describe('OfflineMode', () => {
	it('should render correctly', () => {
		const initialState = {
			infuraAvailability: {
				isBlocked: false
			}
		};
		const wrapper = shallow(<OfflineMode route={{ params: {} }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
