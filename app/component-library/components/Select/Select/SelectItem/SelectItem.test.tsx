// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import SelectItem from './SelectItem';

describe('SelectItem', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <SelectItem>
        <View />
      </SelectItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the selected view if isSelected is false', () => {
    const { queryByRole } = render(
      <SelectItem>
        <View />
      </SelectItem>,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the selected view if isSelected is true', () => {
    const { queryByRole } = render(
      <SelectItem isSelected>
        <View />
      </SelectItem>,
    );
    expect(queryByRole('checkbox')).not.toBeNull();
  });
});
