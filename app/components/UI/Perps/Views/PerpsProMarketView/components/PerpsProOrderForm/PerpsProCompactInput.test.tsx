import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, Pressable, Text } from 'react-native';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsProCompactInput, {
  getPerpsProInputAccessoryID,
  PerpsProInputKeyboardAccessory,
} from './PerpsProCompactInput';

// Mock Input to expose a spyable `focus` via its forwarded ref, mirroring the
// design system's real `forwardRef<TextInput>` contract.
const mockInputFocus = jest.fn();
const mockInputBlur = jest.fn();
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const MockReact = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    ...actual,
    Input: MockReact.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        MockReact.useImperativeHandle(ref, () => ({
          focus: mockInputFocus,
          blur: mockInputBlur,
        }));
        return MockReact.createElement(TextInput, props);
      },
    ),
  };
});

const defaultProps = {
  label: 'Size (USD)',
  value: '',
  onChangeText: jest.fn(),
  testID: 'size-input',
};
const ids = PerpsProOrderFormSelectorsIDs;

describe('PerpsProCompactInput', () => {
  beforeEach(() => {
    // Clears every mock's call history — including `defaultProps.onChangeText`,
    // which is shared across tests since `defaultProps` is a module-level
    // constant — not just `mockInputFocus`, so stale call counts can't bleed
    // between tests.
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('focuses the input when the label is pressed', () => {
    render(<PerpsProCompactInput {...defaultProps} />);

    fireEvent.press(screen.getByText('Size (USD)'));

    expect(mockInputFocus).toHaveBeenCalledTimes(1);
  });

  it('does not focus the input on render, only on label press', () => {
    render(<PerpsProCompactInput {...defaultProps} />);

    expect(mockInputFocus).not.toHaveBeenCalled();
  });

  describe('onFieldPress', () => {
    it('reports a tap that the input consumes before any wrapper sees it', () => {
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput {...defaultProps} onFieldPress={onFieldPress} />,
      );

      // Re-tapping an already-focused input fires no focus event, so press-in on
      // the input itself is the only signal available.
      fireEvent(screen.getByTestId(defaultProps.testID), 'pressIn');

      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });

    it('reports a label tap, which focuses the input indirectly', () => {
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput {...defaultProps} onFieldPress={onFieldPress} />,
      );

      fireEvent.press(screen.getByText(defaultProps.label));

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });

    it('still focuses on label press when no handler is supplied', () => {
      render(<PerpsProCompactInput {...defaultProps} />);

      fireEvent.press(screen.getByText(defaultProps.label));

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
    });

    it('reports taps on the inline variant, which has no label to press', () => {
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          variant="inline"
          onFieldPress={onFieldPress}
        />,
      );

      fireEvent(screen.getByTestId(defaultProps.testID), 'pressIn');

      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('inline field press target', () => {
    it('focuses from a tap anywhere in the row, not just the ~20px of text', () => {
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          variant="inline"
          onFieldPress={onFieldPress}
        />,
      );

      // Without this target, a tap in the row's dead space is unhandled and the
      // enclosing ScrollView dismisses the keyboard instead.
      fireEvent.press(screen.getByTestId(`${defaultProps.testID}-field`));

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });

    it('keeps the end accessory outside the press target so its own press wins', () => {
      const onAccessoryPress = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          variant="inline"
          endAccessory={
            <Pressable testID="mid-price" onPress={onAccessoryPress}>
              <Text>Mid</Text>
            </Pressable>
          }
        />,
      );

      fireEvent.press(screen.getByTestId('mid-price'));

      expect(onAccessoryPress).toHaveBeenCalledTimes(1);
      expect(mockInputFocus).not.toHaveBeenCalled();
    });
  });

  it('uses the custom keyboard accessory without requesting a native Done key', () => {
    render(<PerpsProCompactInput {...defaultProps} />);

    expect(screen.getByTestId(defaultProps.testID)).toHaveProp(
      'inputAccessoryViewID',
      getPerpsProInputAccessoryID(defaultProps.testID),
    );
    expect(screen.getByTestId(defaultProps.testID)).not.toHaveProp(
      'returnKeyType',
    );
    expect(screen.getByTestId(defaultProps.testID)).not.toHaveProp(
      'onSubmitEditing',
    );
  });

  describe('keyboard accessory', () => {
    it('routes Up and Down while disabling missing boundaries', () => {
      const onNext = jest.fn();
      const { rerender } = render(
        <PerpsProInputKeyboardAccessory inputTestID="start" onNext={onNext} />,
      );

      expect(
        screen.getByTestId(`${ids.KEYBOARD_PREVIOUS}-start`),
      ).toBeDisabled();
      expect(
        screen.getByTestId(`${ids.KEYBOARD_DONE}-start`),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId(`${ids.KEYBOARD_NEXT}-start`));
      expect(onNext).toHaveBeenCalledTimes(1);

      const onPrevious = jest.fn();
      rerender(
        <PerpsProInputKeyboardAccessory
          inputTestID="end"
          onPrevious={onPrevious}
        />,
      );

      expect(screen.getByTestId(`${ids.KEYBOARD_NEXT}-end`)).toBeDisabled();
      fireEvent.press(screen.getByTestId(`${ids.KEYBOARD_PREVIOUS}-end`));
      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it('dismisses the keyboard from Done', () => {
      const dismissSpy = jest
        .spyOn(Keyboard, 'dismiss')
        .mockImplementation(jest.fn());
      render(<PerpsProInputKeyboardAccessory inputTestID="size" />);

      fireEvent.press(screen.getByTestId(`${ids.KEYBOARD_CLOSE}-size`));

      expect(dismissSpy).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(`${ids.KEYBOARD_PREVIOUS}-size`),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(`${ids.KEYBOARD_NEXT}-size`),
      ).not.toBeOnTheScreen();
    });
  });

  it('ignores field events while disabled', () => {
    const onChangeText = jest.fn();
    const onFieldPress = jest.fn();
    render(
      <PerpsProCompactInput
        {...defaultProps}
        onChangeText={onChangeText}
        onFieldPress={onFieldPress}
        isDisabled
      />,
    );

    fireEvent.changeText(screen.getByTestId(defaultProps.testID), '25');
    fireEvent.press(screen.getByText(defaultProps.label));

    expect(onChangeText).not.toHaveBeenCalled();
    expect(onFieldPress).not.toHaveBeenCalled();
    expect(mockInputFocus).not.toHaveBeenCalled();
  });

  it('adds top spacing above the footer to match the Figma slider row', () => {
    render(<PerpsProCompactInput {...defaultProps} footer={<></>} />);

    expect(screen.getByTestId(`${defaultProps.testID}-footer`)).toHaveStyle({
      marginTop: 12,
    });
  });

  it('omits the footer wrapper entirely when no footer is provided', () => {
    render(<PerpsProCompactInput {...defaultProps} />);

    expect(
      screen.queryByTestId(`${defaultProps.testID}-footer`),
    ).not.toBeOnTheScreen();
  });

  it('collapses the field without unmounting the native input when hidden', () => {
    render(<PerpsProCompactInput {...defaultProps} isHidden />);

    expect(
      screen.getByTestId(defaultProps.testID, { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${defaultProps.testID}-container`, {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({ height: 0, opacity: 0 });
    expect(
      screen.getByTestId(`${defaultProps.testID}-container`, {
        includeHiddenElements: true,
      }),
    ).toHaveProp('pointerEvents', 'none');
  });

  it('blurs the native input when the field becomes hidden', () => {
    const { rerender } = render(
      <PerpsProCompactInput {...defaultProps} isHidden={false} />,
    );

    expect(mockInputBlur).not.toHaveBeenCalled();

    rerender(<PerpsProCompactInput {...defaultProps} isHidden />);

    expect(mockInputBlur).toHaveBeenCalledTimes(1);
  });
});
