import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import {
  PerpsTradePayWithScreen,
  PerpsTradeSettingsScreen,
} from './PerpsTradeNestedScreens';
import { useDismissOnPaymentChange } from '../../../../Views/confirmations/hooks/pay/useDismissOnPaymentChange';

const mockGoBack = jest.fn();
const mockClose = jest.fn();
const mockRouteGoBack = jest.fn();
let mockPayToken:
  | {
      address: string;
      chainId: string;
    }
  | undefined;
let mockBlurListener: (() => void) | undefined;
let mockFocusListener: (() => void) | undefined;

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
  '../../../../Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({ payToken: mockPayToken }),
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
  addListener: (event: string, listener: () => void) => {
    if (event === 'blur') {
      mockBlurListener = listener;
    } else if (event === 'focus') {
      mockFocusListener = listener;
    }
    return jest.fn();
  },
} as never;

describe('PerpsTradeNestedScreens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPayToken = undefined;
    mockBlurListener = undefined;
    mockFocusListener = undefined;
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
      dismissOnPayTokenChange: false,
      onDismiss: mockGoBack,
    });
  });

  it('ignores token hydration while Pay With remains focused', () => {
    const { rerender } = render(
      <NavigationContext.Provider value={navigationValue}>
        <PerpsTradePayWithScreen />
      </NavigationContext.Provider>,
    );

    mockPayToken = { address: '0x1', chainId: '0x1' };
    rerender(
      <NavigationContext.Provider value={navigationValue}>
        <PerpsTradePayWithScreen />
      </NavigationContext.Provider>,
    );

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('returns to Trade after selecting a token in the child modal', () => {
    const { rerender } = render(
      <NavigationContext.Provider value={navigationValue}>
        <PerpsTradePayWithScreen />
      </NavigationContext.Provider>,
    );

    act(() => mockBlurListener?.());
    mockPayToken = { address: '0x2', chainId: '0x1' };
    rerender(
      <NavigationContext.Provider value={navigationValue}>
        <PerpsTradePayWithScreen />
      </NavigationContext.Provider>,
    );
    act(() => mockFocusListener?.());

    expect(mockGoBack).toHaveBeenCalledTimes(1);
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
