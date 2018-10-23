jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import CreateWallet from './';

describe('CreateWallet', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CreateWallet onPasswordSaved={null} loading={false} error={null} toggleImportFromSeed={null} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
