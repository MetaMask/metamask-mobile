import React from 'react';
import { shallow } from 'enzyme';
import WhatsNewModal from './';

describe('WhatsNewModal', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<WhatsNewModal />);
		expect(wrapper).toMatchSnapshot();
	});
});
