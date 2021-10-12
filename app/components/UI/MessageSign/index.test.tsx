import React from 'react';
import { shallow } from 'enzyme';
import MessageSign from './';

describe('MessageSign', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<MessageSign currentPageInformation={{ title: 'title', url: 'url' }} messageParams={{ data: 'message' }} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
