import React from 'react';
import { shallow } from 'enzyme';
import Contacts from './';
import configureMockStore from 'redux-mock-store';

describe('Contacts', () => {
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
		const wrapper = shallow(
			<Contacts
				navigation={{
					state: { params: {} }
				}}
			/>,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
