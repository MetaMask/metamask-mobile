// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import TextFieldSearch from './TextFieldSearch';
import { TEXTFIELDSEARCH_TEST_ID } from './TextFieldSearch.constants';

describe('TextFieldSearch', () => {
  it('should render default settings correctly', () => {
    const { toJSON } = render(<TextFieldSearch />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render TextFieldSearch', () => {
    const { toJSON } = render(<TextFieldSearch />);
    const textFieldSearchComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXTFIELDSEARCH_TEST_ID,
    );
    expect(textFieldSearchComponent.exists()).toBe(true);
  });
});
