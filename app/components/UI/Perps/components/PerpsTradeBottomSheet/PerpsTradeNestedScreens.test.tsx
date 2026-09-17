import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { PerpsTradeSettingsScreen } from './PerpsTradeNestedScreens';

const mockGoBack = jest.fn();
const mockClose = jest.fn();
const mockRouteGoBack = jest.fn();

jest.mock('./PerpsTradeBottomSheet', () => ({
  usePerpsTradeSheet: () => ({
    close: mockClose,
    goBack: mockGoBack,
  }),
}));

jest.mock('../PerpsLeverageBottomSheet', () => () => null);
jest.mock('../PerpsSlippageBottomSheet', () => {
  const { Pressable: MockPressable } = jest.requireActual('react-native');
  return (props: unknown) => {
    const { onBack, onClose, onSave, onSaveComplete } = props as {
      onBack: () => void;
      onClose: () => void;
      onSave: (value: number) => void;
      onSaveComplete: () => void;
    };
    return (
      <>
        <MockPressable testID="settings-back" onPress={onBack} />
        <MockPressable testID="settings-close" onPress={onClose} />
        <MockPressable
          testID="settings-save"
          onPress={() => {
            onSave(100);
            onSaveComplete();
          }}
        />
      </>
    );
  };
});

const navigationValue = {
  goBack: mockRouteGoBack,
  isFocused: () => true,
  addListener: () => jest.fn(),
} as never;

describe('PerpsTradeNestedScreens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders functional slippage settings in the nested screen', () => {
    const onSave = jest.fn();
    render(
      <NavigationContext.Provider value={navigationValue}>
        <PerpsTradeSettingsScreen currentValueBps={50} onSave={onSave} />
      </NavigationContext.Provider>,
    );

    fireEvent.press(screen.getByTestId('settings-save'));

    expect(onSave).toHaveBeenCalledWith(100);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('closes the whole sheet from the nested settings screen', () => {
    render(
      <NavigationContext.Provider value={navigationValue}>
        <PerpsTradeSettingsScreen currentValueBps={50} onSave={jest.fn()} />
      </NavigationContext.Provider>,
    );

    fireEvent.press(screen.getByTestId('settings-close'));

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mockRouteGoBack).not.toHaveBeenCalled();
  });
});
