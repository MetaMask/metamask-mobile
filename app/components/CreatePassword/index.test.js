jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import CreatePassword from './';

describe('CreatePassword', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CreatePassword onPasswordSaved={null} loading={false} error={null} toggleImportFromSeed={null} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
