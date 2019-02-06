import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep5 from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('AccountBackupStep5', () => {
	it('should render correctly', () => {
		const initialState = {
			user: {
				passwordSet: true,
				seedphraseBackedUp: false
			}
		};

		const wrapper = shallow(
			<AccountBackupStep5
				navigation={{
					getParam: () => [
						'abstract',
						'accident',
						'acoustic',
						'announce',
						'artefact',
						'attitude',
						'bachelor',
						'broccoli',
						'business',
						'category',
						'champion',
						'cinnamon'
					],
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
