import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import GlassMainActionButton from './GlassMainActionButton';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../GlassSurface';

describe('GlassMainActionButton', () => {
  it('renders the plain button without glass', () => {
    const { getByText, queryByTestId } = render(
      <GlassMainActionButton
        iconName={IconName.Add}
        label="Add"
        onPress={jest.fn()}
        isGlass={false}
      />,
    );

    expect(getByText('Add')).toBeOnTheScreen();
    expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
  });

  it('draws the button on the glass sheen and keeps it pressable', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <GlassMainActionButton
        iconName={IconName.Add}
        label="Add"
        onPress={onPress}
        testID="add"
        isGlass
      />,
    );

    expect(getByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId('add')).toHaveStyle({ backgroundColor: 'transparent' });

    fireEvent.press(getByTestId('add'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
