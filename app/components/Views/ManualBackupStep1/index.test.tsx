import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import ManualBackupStep1 from './';

const mockStore = configureMockStore();
const initialState = {
	user: { appTheme: 'light' },
};
const store = mockStore(initialState);

describe('ManualBackupStep1', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<Provider store={store}>
				<ManualBackupStep1
					route={{
						params: {
							words: [
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
								'cinnamon',
							],
						},
					}}
				/>
			</Provider>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
