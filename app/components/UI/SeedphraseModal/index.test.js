import React from 'react';
import { shallow } from 'enzyme';
import SeedphraseModal from './index.test';

describe('SeedphraseModal', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SeedphraseModal />);
		expect(wrapper).toMatchSnapshot();
	});
});
