import React from 'react';
import { shallow } from 'enzyme';
import ReceiveRequest from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('ReceiveRequest', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: { selectedAddress: '0x' },
					NetworkController: { network: '1' }
				}
			},
			modals: {
				receiveAsset: {}
			}
		};

		const wrapper = shallow(<ReceiveRequest />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
