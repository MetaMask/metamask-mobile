import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import MainActionButtonGlass from './MainActionButtonGlass';
import { RAISED_SHEEN_TEST_ID } from '../elevation/RaisedSheenSurface';

let mockIsGlassEnabled = true;
jest.mock('../../hooks/useLiquidGlass', () => {
  const actual = jest.requireActual('../../hooks/useLiquidGlass');
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: mockIsGlassEnabled,
    }),
  };
});

describe('MainActionButtonGlass', () => {
  beforeEach(() => {
    mockIsGlassEnabled = true;
  });

  it('draws an opaque raised plate even when glass is unavailable', () => {
    mockIsGlassEnabled = false;

    const { getByText, getByTestId } = render(
      <MainActionButtonGlass
        iconName={IconName.Add}
        label="Add"
        onPress={jest.fn()}
        isGlass
      />,
    );

    expect(getByText('Add')).toBeOnTheScreen();
    expect(getByTestId(RAISED_SHEEN_TEST_ID)).toBeOnTheScreen();
  });

  it('draws an opaque raised plate when isGlass is false', () => {
    const { getByText, getByTestId } = render(
      <MainActionButtonGlass
        iconName={IconName.Add}
        label="Add"
        onPress={jest.fn()}
        isGlass={false}
      />,
    );

    expect(getByText('Add')).toBeOnTheScreen();
    expect(getByTestId(RAISED_SHEEN_TEST_ID)).toBeOnTheScreen();
  });

  it('keeps the plate pressable', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MainActionButtonGlass
        iconName={IconName.Add}
        label="Add"
        onPress={onPress}
        testID="add"
        isGlass
      />,
    );

    expect(getByTestId(RAISED_SHEEN_TEST_ID)).toBeOnTheScreen();
    expect(getByTestId('add')).toHaveStyle({ backgroundColor: 'transparent' });

    fireEvent.press(getByTestId('add'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
