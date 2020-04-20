import React from 'react';
import { shallow } from 'enzyme';
import ExpandedMessage from './';

describe('ExpandedMessage', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<ExpandedMessage currentPageInformation={{ title: 'title', url: 'url' }} />);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
