import React from 'react';
import { shallow } from 'enzyme';
import PersonalSign from './';

describe('PersonalSign', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<PersonalSign currentPageInformation={{ title: 'title', url: 'url' }} messageParams={{ data: 'message' }} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
