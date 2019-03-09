import React from 'react';
import { shallow } from 'enzyme';
import AdvancedSettings from './';
import configureMockStore from 'redux-mock-store';

describe('AdvancedSettings', () => {
	const mockStore = configureMockStore();

	it('should render correctly', () => {
		const initialState = {
			settings: { showHexData: true }
		};

		const wrapper = shallow(
			<AdvancedSettings
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
