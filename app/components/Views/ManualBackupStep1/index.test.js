import React from 'react';
import { shallow } from 'enzyme';
import ManualBackupStep1 from './';

describe('ManualBackupStep1', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<ManualBackupStep1
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
