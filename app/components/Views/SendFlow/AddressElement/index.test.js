import React from 'react';
import { shallow } from 'enzyme';
import AddressElement from './';
import configureMockStore from 'redux-mock-store';

describe('AddressElement', () => {
	const mockStore = configureMockStore();
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					NetworkController: {
						network: '1'
					}
				}
			}
		};
		const wrapper = shallow(<AddressElement />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
