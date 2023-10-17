// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import { TEXTFIELDSEARCH_TEST_ID } from './TextFieldSearch.constants';

describe('TextFieldSearch', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<TextFieldSearch />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render TextFieldSearch', () => {
    const wrapper = shallow(<TextFieldSearch />);
    const textFieldSearchComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );
    expect(textFieldSearchComponent.exists()).toBe(true);
  });
});
