import React from 'react';
import { shallow } from 'enzyme';
import SaveYourSeedPhrase from './';

describe('SaveYourSeedPhrase', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SaveYourSeedPhrase />);
		expect(wrapper).toMatchSnapshot();
	});
});
