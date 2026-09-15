import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import {
  PerpsTradePayWithScreen,
  PerpsTradeSettingsScreen,
} from './PerpsTradeNestedScreens';
import { useDismissOnPaymentChange } from '../../../../Views/confirmations/hooks/pay/useDismissOnPaymentChange';

const mockGoBack = jest.fn();
const mockClose = jest.fn();
const mockRouteGoBack = jest.fn();

jest.mock('./PerpsTradeBottomSheet', () => ({
  usePerpsTradeSheet: () => ({
    close: mockClose,
    goBack: mockGoBack,
  }),
}));

jest.mock(
  '../../../../Views/confirmations/hooks/pay/useDismissOnPaymentChange',
  () => ({
    useDismissOnPaymentChange: jest.fn(),
  }),
);

jest.mock(
  '../../../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet',
  () => {
    const { useNavigation: mockUseNavigation } = jest.requireActual(
      '@react-navigation/native',
    );
    const { Pressable: MockPressable, Text: MockText } =
      jest.requireActual('react-native');

    return {
      PayWithScreenContent: () => {
        const navigation = mockUseNavigation();
        return (
          <MockPressable
            testID="select-payment"
            onPress={() => navigation.goBack()}
          >
            <MockText>Select payment</MockText>
          </MockPressable>
        );
      },
    };
  },
);

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
} as never;

describe('PerpsTradeNestedScreens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Pay With row selection inside the Trade stepper', () => {
    render(
      <NavigationContext.Provider value={navigationValue}>
        <PerpsTradePayWithScreen />
      </NavigationContext.Provider>,
    );

    fireEvent.press(screen.getByTestId('select-payment'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockRouteGoBack).not.toHaveBeenCalled();
    expect(jest.mocked(useDismissOnPaymentChange)).toHaveBeenCalledWith({
      onDismiss: mockGoBack,
    });
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
});
