import React from 'react';
import { shallow } from 'enzyme';
import SearchAssetAutocomplete from './';

describe('SearchAssetAutocomplete', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<SearchAssetAutocomplete />);
		expect(wrapper).toMatchSnapshot();
	});
});
