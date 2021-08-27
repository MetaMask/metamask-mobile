import React from 'react';
import { shallow } from 'enzyme';
import TypedSign from './';

describe('TypedSign', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<TypedSign
				currentPageInformation={{ title: 'title', url: 'url' }}
				messageParams={{ data: { type: 'string', name: 'Message', value: 'Hi, Alice!' } }}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
