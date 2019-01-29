jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import ChoosePassword from './';

describe('ChoosePassword', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<ChoosePassword onPasswordSaved={null} loading={false} error={null} toggleImportFromSeed={null} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
