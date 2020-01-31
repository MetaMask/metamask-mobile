import React from 'react';
import { shallow } from 'enzyme';
import TransactionDirection from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('TransactionDirection', () => {
	it('should render correctly', () => {
		const initialState = {
			transaction: {},
			engine: {
				backgroundState: {
					PreferencesController: {
						identities: { '0x1': { name: 'Account 1' } }
					}
				}
			}
		};

		const wrapper = shallow(<TransactionDirection />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
