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
					},
					AddressBookController: {
						addressBook: {
							'0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
								address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
								chainId: '1',
								isEns: false,
								memo: '',
								name: 'aa'
							}
						}
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
