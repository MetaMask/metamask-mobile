import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep4 from './';

describe('AccountBackupStep4', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<AccountBackupStep4
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
