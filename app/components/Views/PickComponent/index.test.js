import React from 'react';
import { shallow } from 'enzyme';
import PickComponent from './';

describe('PickComponent', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<PickComponent
				textFirst={'Text First'}
				valueFirst={'valueFirst'}
				textSecond={'Text Second'}
				valueSecond={'valueSecond'}
				selectedValue={'valueSecond'}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
