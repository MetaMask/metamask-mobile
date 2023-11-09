// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemMultiSelect from './ListItemMultiSelect';

describe('ListItemMultiSelect', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <ListItemMultiSelect>
        <View />
      </ListItemMultiSelect>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the selected view if isSelected is false', () => {
    const { queryByRole } = render(
      <ListItemMultiSelect>
        <View />
      </ListItemMultiSelect>,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the selected view if isSelected is true', () => {
    const { queryByRole } = render(
      <ListItemMultiSelect isSelected>
        <View />
      </ListItemMultiSelect>,
    );
    expect(queryByRole('checkbox')).not.toBeNull();
  });
});
