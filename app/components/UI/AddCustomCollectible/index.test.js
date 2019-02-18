import React from 'react';
import { shallow } from 'enzyme';
import AddCustomCollectible from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AddCustomCollectible', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: {
						selectedAddress: '0x1'
					}
				}
			}
		};

		const wrapper = shallow(<AddCustomCollectible navigation={{ state: { params: {} } }} />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
