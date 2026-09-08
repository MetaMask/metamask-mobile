import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomSlippageBottomSheet from './CustomSlippageBottomSheet';
import {
  CUSTOM_SLIPPAGE_BOTTOM_SHEET_TESTID,
  CUSTOM_SLIPPAGE_CANCEL_TESTID,
  CUSTOM_SLIPPAGE_CLOSE_TESTID,
  CUSTOM_SLIPPAGE_CONFIRM_TESTID,
} from './CustomSlippageBottomSheet.constants';
import {
  INPUTSTEPPER_MINUS_BUTTON_TESTID,
  INPUTSTEPPER_PLUS_BUTTON_TESTID,
} from '../../../component-library/components-temp/InputStepper';
import { TextColor } from '@metamask/design-system-react-native';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const BottomSheet = ReactModule.forwardRef(
    (
      props: {
        children: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactModule.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: () => undefined,
        onCloseBottomSheet: (callback?: () => void) => {
          props.onClose?.();
          callback?.();
        },
      }));
      return <View testID={props.testID}>{props.children}</View>;
    },
  );

  const BottomSheetHeader = ({
    children,
    onClose,
    closeButtonProps,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
    closeButtonProps?: { testID?: string };
  }) => (
    <View>
      <Text>{children}</Text>
      <TouchableOpacity testID={closeButtonProps?.testID} onPress={onClose} />
    </View>
  );

  const BottomSheetFooter = ({
    primaryButtonProps,
    secondaryButtonProps,
  }: {
    primaryButtonProps: {
      children: React.ReactNode;
      onPress: () => void;
      isDisabled?: boolean;
      testID?: string;
    };
    secondaryButtonProps: {
      children: React.ReactNode;
      onPress: () => void;
      testID?: string;
    };
  }) => (
    <View>
      <TouchableOpacity
        testID={secondaryButtonProps.testID}
        onPress={secondaryButtonProps.onPress}
      >
        <Text>{secondaryButtonProps.children}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID={primaryButtonProps.testID}
        onPress={primaryButtonProps.onPress}
        disabled={primaryButtonProps.isDisabled}
        accessibilityState={{ disabled: primaryButtonProps.isDisabled }}
      >
        <Text>{primaryButtonProps.children}</Text>
      </TouchableOpacity>
    </View>
  );

  return {
    ...actual,
    BottomSheet,
    BottomSheetHeader,
    BottomSheetFooter,
  };
});

jest.mock('../../Base/Keypad', () => ({
  __esModule: true,
  Keys: {
    Back: 'Back',
    Period: 'Period',
    Digit5: '5',
  },
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (data: {
      value: string;
      valueAsNumber: number;
      pressedKey: string;
    }) => void;
  }) => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <View testID="keypad">
        <Text testID="keypad-value">{value}</Text>
        <TouchableOpacity
          testID="keypad-button-5"
          onPress={() =>
            onChange({
              value: `${value}5`,
              valueAsNumber: parseFloat(`${value}5`),
              pressedKey: '5',
            })
          }
        >
          <Text>5</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

describe('CustomSlippageBottomSheet', () => {
  const defaultProps = {
    title: 'Slippage',
    primaryButtonLabel: 'Confirm',
    secondaryButtonLabel: 'Cancel',
    value: '2',
    onValueChange: jest.fn(),
    minAmount: 0,
    maxAmount: 100,
    step: 0.1,
    inputMaxDecimals: 1,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { toJSON } = render(
      <CustomSlippageBottomSheet {...defaultProps} isVisible={false} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders the provided title and CTA labels', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} />);

    expect(screen.getByText('Slippage')).toBeOnTheScreen();
    expect(screen.getByText('Confirm')).toBeOnTheScreen();
    expect(screen.getByText('Cancel')).toBeOnTheScreen();
    expect(
      screen.getByTestId(CUSTOM_SLIPPAGE_BOTTOM_SHEET_TESTID),
    ).toBeOnTheScreen();
  });

  it('closes without confirming when cancel is pressed', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId(CUSTOM_SLIPPAGE_CANCEL_TESTID));

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('closes without confirming when header close is pressed', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId(CUSTOM_SLIPPAGE_CLOSE_TESTID));

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('confirms the sanitized value when confirm is pressed', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} value="2." />);

    fireEvent.press(screen.getByTestId(CUSTOM_SLIPPAGE_CONFIRM_TESTID));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith('2');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not confirm when the primary button is disabled', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} isConfirmDisabled />);

    fireEvent.press(screen.getByTestId(CUSTOM_SLIPPAGE_CONFIRM_TESTID));

    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('increases the value by step when plus is pressed', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId(INPUTSTEPPER_PLUS_BUTTON_TESTID));

    expect(defaultProps.onValueChange).toHaveBeenCalledWith('2.1');
  });

  it('caps the value at maxAmount when plus exceeds the maximum', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} value="99.95" />);

    fireEvent.press(screen.getByTestId(INPUTSTEPPER_PLUS_BUTTON_TESTID));

    expect(defaultProps.onValueChange).toHaveBeenCalledWith('100');
  });

  it('decreases the value by step when minus is pressed', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId(INPUTSTEPPER_MINUS_BUTTON_TESTID));

    expect(defaultProps.onValueChange).toHaveBeenCalledWith('1.9');
  });

  it('caps the value at minAmount when minus goes below the minimum', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} value="0.05" />);

    fireEvent.press(screen.getByTestId(INPUTSTEPPER_MINUS_BUTTON_TESTID));

    expect(defaultProps.onValueChange).toHaveBeenCalledWith('0');
  });

  it('forwards keypad input to onValueChange', () => {
    render(<CustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId('keypad-button-5'));

    expect(defaultProps.onValueChange).toHaveBeenCalledWith('25');
  });

  it('renders a description when provided', () => {
    render(
      <CustomSlippageBottomSheet
        {...defaultProps}
        description={{
          message: 'Out of range',
          color: TextColor.ErrorDefault,
        }}
      />,
    );

    expect(screen.getByText('Out of range')).toBeOnTheScreen();
  });
});
