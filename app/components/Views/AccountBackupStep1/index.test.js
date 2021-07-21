import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep1 from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AccountBackupStep1', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					NetworkController: {
						provider: {
							chainId: '1'
						}
					}
				}
			}
		};

		const wrapper = shallow(<AccountBackupStep1 />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper).toMatchSnapshot();
	});
});
