import React from 'react';
import { shallow } from 'enzyme';
import PhishingModal from './';

describe('PhishingModal', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<PhishingModal
				currentPageInformation={{ title: 'title', url: 'url' }}
				messageParams={{ data: 'message' }}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
