// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import {
  TEXTFIELDSEARCH_TEST_ID,
  TEXTFIELDSEARCH_SEARCHICON_TEST_ID,
  TEXTFIELDSEARCH_CLEARBUTTON_TEST_ID,
} from './TextFieldSearch.constants';

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
  it('should render the search icon', () => {
    const wrapper = shallow(<TextFieldSearch />);
    const textFieldSearchIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_SEARCHICON_TEST_ID,
    );
    expect(textFieldSearchIconComponent.exists()).toBe(true);
  });
  it('should render the clearButton if showClearButton=true', () => {
    const wrapper = shallow(<TextFieldSearch showClearButton />);
    const textFieldSearchComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_CLEARBUTTON_TEST_ID,
    );
    expect(textFieldSearchComponent.exists()).toBe(true);
  });
});
