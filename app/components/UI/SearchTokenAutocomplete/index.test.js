import React from 'react';
import { shallow } from 'enzyme';
import SearchTokenAutocomplete from './';

describe('SearchTokenAutocomplete', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SearchTokenAutocomplete />);
		expect(wrapper).toMatchSnapshot();
	});
});
