import React from 'react';
import { shallow } from 'enzyme';
import Login from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('Login', () => {
	it('should render correctly', () => {
		const initialState = {
			settings: {
				nightMode: false
			},
			engine: {
				backgroundState: {
					AccountTrackerController: {
						accounts: { '0x2': { balance: '0' } }
					},
					NetworkController: {
						provider: {
							type: 'ropsten'
						}
					},
					AssetsController: {
						tokens: []
					}
				}
			}
		};

		const wrapper = shallow(<Login />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
