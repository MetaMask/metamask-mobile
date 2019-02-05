import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep5 from './';

describe('AccountBackupStep5', () => {
	it('should render correctly', () => {
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
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
