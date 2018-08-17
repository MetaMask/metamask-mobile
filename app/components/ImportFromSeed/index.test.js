import React from 'react';
import { shallow } from 'enzyme';
import ImportFromSeed from './';

describe('ImportFromSeed', () => {
	it('should render correctly', () => {
		jest.mock('Keychain', () => {
			const Keychain = require.requireActual('Keychain');
			return Keychain;
		});
		const wrapper = shallow(<ImportFromSeed />);
		expect(wrapper).toMatchSnapshot();
	});
});
