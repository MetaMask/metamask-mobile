import React from 'react';
import { shallow } from 'enzyme';
import ScanStep from './';

describe('ScanStep', () => {
	it('should render correctly', () => {
		const step = shallow(<ScanStep step={1}>some text</ScanStep>);
		expect(step).toMatchSnapshot();
	});
});
