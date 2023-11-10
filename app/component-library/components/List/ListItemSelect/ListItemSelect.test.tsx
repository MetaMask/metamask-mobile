// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies.

// Internal dependencies.
import ListItemSelect from './ListItemSelect';

describe('ListItemSelect', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(
      <ListItemSelect>
        <View />
      </ListItemSelect>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should not render the selected view if isSelected is false', () => {
    const { queryByRole } = render(
      <ListItemSelect>
        <View />
      </ListItemSelect>,
    );
    expect(queryByRole('checkbox')).toBeNull();
  });

  it('should render the selected view if isSelected is true', () => {
    const { queryByRole } = render(
      <ListItemSelect isSelected>
        <View />
      </ListItemSelect>,
    );
    expect(queryByRole('checkbox')).not.toBeNull();
  });
});
