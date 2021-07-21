import React from 'react';
import { shallow } from 'enzyme';
import NetworkSettings from './';
import configureMockStore from 'redux-mock-store';
describe('NetworkSettings', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: {
						frequentRpcList: []
					}
				}
			}
		};
		const wrapper = shallow(<NetworkSettings route={{ params: {} }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
