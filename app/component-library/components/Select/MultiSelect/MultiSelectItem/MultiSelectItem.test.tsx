// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import MultiSelectItem from './MultiSelectItem';

describe('MultiSelectItem', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <MultiSelectItem>
        <View />
      </MultiSelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the selected view if isSelected is false', () => {
    const { queryByRole } = render(
      <MultiSelectItem>
        <View />
      </MultiSelectItem>,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the selected view if isSelected is true', () => {
    const { queryByRole } = render(
      <MultiSelectItem isSelected>
        <View />
      </MultiSelectItem>,
    );
    expect(queryByRole('checkbox')).not.toBeNull();
  });
});
