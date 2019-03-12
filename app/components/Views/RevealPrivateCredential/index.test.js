import React from 'react';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';
import RevealPrivateCredential from './';

const mockStore = configureMockStore();

describe('RevealPrivateCredential', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					PreferencesController: {
						selectedAddress: '0xe7E125654064EEa56229f273dA586F10DF96B0a1'
					}
				}
			},
			user: {
				passwordSet: false
			}
		};
		const wrapper = shallow(
			<RevealPrivateCredential navigation={{ state: { params: { privateCredentialName: 'private_key' } } }} />,
			{ context: { store: mockStore(initialState) } }
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
