import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, Pressable, Text } from 'react-native';
import {
  getPerpsProCompactInputLabelContainerTestId,
  getPerpsProCompactInputRowTestId,
  PerpsProOrderFormSelectorsIDs,
} from '../../../../Perps.testIds';
import { usePerpsLocale } from '../../../../hooks/usePerpsLocale';
import PerpsProCompactInput, {
  getPerpsProInputAccessoryID,
  PerpsProInputKeyboardAccessory,
  type PerpsProCompactInputRef,
} from './PerpsProCompactInput';

jest.mock('../../../../hooks/usePerpsLocale', () => ({
  usePerpsLocale: jest.fn(() => 'en-US'),
}));

// Mock Input to expose a spyable `focus` via its forwarded ref, mirroring the
// design system's real `forwardRef<TextInput>` contract.
const mockInputFocus = jest.fn();
const mockInputBlur = jest.fn();
const mockInputUnmount = jest.fn();
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const MockReact = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    ...actual,
    Input: MockReact.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        MockReact.useImperativeHandle(ref, () => ({
          focus: () => mockInputFocus(props),
          blur: mockInputBlur,
        }));
        MockReact.useEffect(
          () => () => {
            mockInputUnmount();
          },
          [],
        );
        return MockReact.createElement(TextInput, {
          ...props,
          editable: props.isDisabled === true ? false : props.editable,
        });
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
const floatingLabelVariants = ['inline', 'inline-labeled'] as const;
const ids = PerpsProOrderFormSelectorsIDs;

describe('PerpsProCompactInput', () => {
  beforeEach(() => {
    // Clears every mock's call history — including `defaultProps.onChangeText`,
    // which is shared across tests since `defaultProps` is a module-level
    // constant — not just `mockInputFocus`, so stale call counts can't bleed
    // between tests.
    jest.clearAllMocks();
    jest.mocked(usePerpsLocale).mockReturnValue('en-US');
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

  describe('keyboard arrow focus', () => {
    it('leaves an empty inline field unfocused until an arrow moves to it', () => {
      render(
        <PerpsProCompactInput {...defaultProps} variant="inline-labeled" />,
      );

      expect(mockInputFocus).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(
          getPerpsProCompactInputLabelContainerTestId(defaultProps.testID),
        ),
      ).toHaveStyle({
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
      });
    });

    it('focuses an empty inline field from the keyboard arrow', () => {
      const ref = React.createRef<PerpsProCompactInputRef>();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          ref={ref}
          variant="inline-labeled"
        />,
      );

      act(() => {
        ref.current?.focus();
      });

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(mockInputFocus).toHaveBeenCalledWith(
        expect.objectContaining({
          twClassName: 'flex-1 border-0 bg-transparent p-0',
        }),
      );
      expect(
        screen.getByTestId(
          getPerpsProCompactInputLabelContainerTestId(defaultProps.testID),
        ),
      ).toHaveStyle({ position: 'absolute', top: 0 });
    });

    it('does not expand a disabled field when an arrow moves to it', () => {
      const ref = React.createRef<PerpsProCompactInputRef>();
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          ref={ref}
          variant="inline-labeled"
          isDisabled
          onFieldPress={onFieldPress}
        />,
      );

      act(() => {
        ref.current?.focus();
      });

      expect(mockInputFocus).not.toHaveBeenCalled();
      expect(onFieldPress).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(
          getPerpsProCompactInputLabelContainerTestId(defaultProps.testID),
        ),
      ).toHaveStyle({
        position: 'absolute',
        justifyContent: 'center',
      });
    });
  });

  it('keeps the editing locale when the app locale changes while focused', () => {
    const onChangeText = jest.fn();
    const props = { ...defaultProps, value: '1200', onChangeText };
    const { rerender } = render(<PerpsProCompactInput {...props} />);
    const input = screen.getByTestId(defaultProps.testID);

    expect(input).toHaveProp('value', '1,200');

    fireEvent(input, 'focus');
    jest.mocked(usePerpsLocale).mockReturnValue('de-DE');
    rerender(<PerpsProCompactInput {...props} />);

    expect(input).toHaveProp('value', '1,200');

    fireEvent.changeText(input, '1,200');

    expect(onChangeText).toHaveBeenLastCalledWith('1200');

    fireEvent(input, 'blur');

    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(input).toHaveProp('value', '1.200');
  });

  describe('onFieldPress', () => {
    it('uses onFocus instead of reporting a second alignment for an initial direct input tap', () => {
      const onFieldPress = jest.fn();
      const onFocus = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          onFieldPress={onFieldPress}
          onFocus={onFocus}
        />,
      );

      const input = screen.getByTestId(defaultProps.testID);
      fireEvent(input, 'pressIn');
      fireEvent(input, 'focus');

      expect(onFocus).not.toHaveBeenCalled();

      fireEvent(input, 'pressOut');

      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onFieldPress).not.toHaveBeenCalled();
    });

    it('reports a direct input re-tap after release', () => {
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput {...defaultProps} onFieldPress={onFieldPress} />,
      );

      const input = screen.getByTestId(defaultProps.testID);
      fireEvent(input, 'focus');
      fireEvent(input, 'pressIn');

      fireEvent(input, 'pressOut');

      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });

    it('reports wrapper-driven native focus without treating it as a re-tap', () => {
      const onFieldPress = jest.fn();
      const onFocus = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          onFieldPress={onFieldPress}
          onFocus={onFocus}
        />,
      );

      fireEvent.press(screen.getByText(defaultProps.label));
      fireEvent(screen.getByTestId(defaultProps.testID), 'focus');

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onFieldPress).not.toHaveBeenCalled();
    });

    it('reports a wrapper re-tap without requesting native focus again', () => {
      const onFieldPress = jest.fn();
      const onFocus = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          onFieldPress={onFieldPress}
          onFocus={onFocus}
        />,
      );
      const input = screen.getByTestId(defaultProps.testID);
      fireEvent(input, 'focus');
      onFocus.mockClear();

      fireEvent.press(screen.getByText(defaultProps.label));

      expect(mockInputFocus).not.toHaveBeenCalled();
      expect(onFocus).not.toHaveBeenCalled();
      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });

    it('still focuses on label press when no handler is supplied', () => {
      render(<PerpsProCompactInput {...defaultProps} />);

      fireEvent.press(screen.getByText(defaultProps.label));

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
    });

    it('reports a visible inline input tap after release', () => {
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          value="1"
          variant="inline"
          onFieldPress={onFieldPress}
        />,
      );

      const input = screen.getByTestId(defaultProps.testID);
      fireEvent(input, 'focus');
      fireEvent(input, 'pressIn');

      expect(onFieldPress).not.toHaveBeenCalled();

      fireEvent(input, 'pressOut');

      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });

    it('clears an interrupted direct press before imperative focus', () => {
      const onFocus = jest.fn();
      const ref = React.createRef<PerpsProCompactInputRef>();
      render(
        <PerpsProCompactInput {...defaultProps} ref={ref} onFocus={onFocus} />,
      );
      const input = screen.getByTestId(defaultProps.testID);
      fireEvent(input, 'pressIn');
      fireEvent(input, 'focus');

      expect(onFocus).not.toHaveBeenCalled();

      fireEvent(input, 'blur');
      act(() => ref.current?.focus());
      fireEvent(input, 'focus');

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(onFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe('inline field press target', () => {
    it.each(floatingLabelVariants)(
      'uses the shared 54px compact-row height and 4px vertical padding for %s fields',
      (variant) => {
        render(<PerpsProCompactInput {...defaultProps} variant={variant} />);

        expect(
          screen.getByTestId(`${defaultProps.testID}-container`),
        ).toHaveStyle({ height: 54, paddingTop: 4, paddingBottom: 4 });
      },
    );

    it.each(floatingLabelVariants)(
      'hides the %s decorative label from assistive technology',
      (variant) => {
        render(<PerpsProCompactInput {...defaultProps} variant={variant} />);

        const label = screen.getByTestId(`${defaultProps.testID}-label`);
        const input = screen.getByTestId(defaultProps.testID, {
          includeHiddenElements: true,
        });

        expect(label).toHaveProp('accessible', false);
        expect(label).toHaveProp('importantForAccessibility', 'no');
        expect(input).toHaveProp('accessibilityLabel', defaultProps.label);
      },
    );

    it.each(floatingLabelVariants)(
      'keeps the empty %s native input frame stable through focus handoff',
      (variant) => {
        render(<PerpsProCompactInput {...defaultProps} variant={variant} />);
        const input = screen.getByTestId(defaultProps.testID, {
          includeHiddenElements: true,
        });
        const label = screen.getByTestId(`${defaultProps.testID}-label`);
        const inputRow = screen.getByTestId(
          getPerpsProCompactInputRowTestId(defaultProps.testID),
        );
        const inactiveLabelStyle = label.props.style;
        const inactiveInputRowStyle = inputRow.props.style;

        fireEvent(input, 'pressIn');

        expect(inputRow).toHaveProp('collapsable', false);
        expect(label.props.style).toEqual(inactiveLabelStyle);
        expect(inputRow.props.style).toEqual(inactiveInputRowStyle);
        expect(
          screen.getByTestId(
            getPerpsProCompactInputLabelContainerTestId(defaultProps.testID),
          ),
        ).toHaveStyle({
          position: 'absolute',
          top: 0,
          bottom: 0,
          justifyContent: 'center',
        });

        fireEvent(input, 'focus');

        expect(
          screen.getByTestId(
            getPerpsProCompactInputRowTestId(defaultProps.testID),
          ),
        ).toHaveProp('collapsable', false);
        expect(
          screen.getByTestId(
            getPerpsProCompactInputRowTestId(defaultProps.testID),
          ),
        ).toHaveStyle({
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        });
        expect(
          screen.getByTestId(
            getPerpsProCompactInputLabelContainerTestId(defaultProps.testID),
          ),
        ).toHaveStyle({ position: 'absolute', top: 0 });
      },
    );

    it.each(floatingLabelVariants)(
      'shrinks the %s label and reveals the input when the row is pressed',
      (variant) => {
        render(
          <PerpsProCompactInput
            {...defaultProps}
            variant={variant}
            placeholder="0.00"
            startAccessory={<Text>$</Text>}
          />,
        );

        const label = screen.getByTestId(`${defaultProps.testID}-label`);
        const input = screen.getByTestId(defaultProps.testID, {
          includeHiddenElements: true,
        });
        const inactiveLabelStyle = label.props.style;

        expect(input).toHaveProp('placeholder', '0.00');

        fireEvent.press(screen.getByTestId(`${defaultProps.testID}-field`));

        expect(label.props.style).not.toEqual(inactiveLabelStyle);
        expect(input).toHaveProp('placeholder', '0.00');
        expect(mockInputFocus).toHaveBeenCalledTimes(1);
        expect(mockInputFocus).toHaveBeenCalledWith(
          expect.objectContaining({
            placeholder: '0.00',
            twClassName: 'flex-1 border-0 bg-transparent p-0',
          }),
        );
        expect(mockInputUnmount).not.toHaveBeenCalled();
      },
    );

    it.each(floatingLabelVariants)(
      'restores the full label after an empty %s field blurs',
      (variant) => {
        render(<PerpsProCompactInput {...defaultProps} variant={variant} />);

        const label = screen.getByTestId(`${defaultProps.testID}-label`);
        const inactiveLabelStyle = label.props.style;

        fireEvent.press(screen.getByTestId(`${defaultProps.testID}-field`));
        fireEvent(screen.getByTestId(defaultProps.testID), 'blur');

        expect(label.props.style).toEqual(inactiveLabelStyle);
        expect(
          screen.getByTestId(defaultProps.testID, {
            includeHiddenElements: true,
          }),
        ).toHaveProp('placeholder', '0');
      },
    );

    it.each(floatingLabelVariants)(
      'keeps the compact label after a populated %s field blurs',
      (variant) => {
        render(
          <PerpsProCompactInput
            {...defaultProps}
            value="123.45"
            variant={variant}
          />,
        );

        const label = screen.getByTestId(`${defaultProps.testID}-label`);
        const compactLabelStyle = label.props.style;

        fireEvent(screen.getByTestId(defaultProps.testID), 'blur');

        expect(label.props.style).toEqual(compactLabelStyle);
      },
    );

    it('focuses from a tap anywhere in the row, not just the ~20px of text', () => {
      const onFieldPress = jest.fn();
      const onFocus = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          variant="inline"
          onFieldPress={onFieldPress}
          onFocus={onFocus}
        />,
      );

      // Without this target, a tap in the row's dead space is unhandled and the
      // enclosing ScrollView dismisses the keyboard instead.
      fireEvent.press(screen.getByTestId(`${defaultProps.testID}-field`));
      fireEvent(screen.getByTestId(defaultProps.testID), 'focus');

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onFieldPress).not.toHaveBeenCalled();
    });

    it.each(floatingLabelVariants)(
      'exposes an empty %s input as the sole labeled accessibility target',
      (variant) => {
        render(<PerpsProCompactInput {...defaultProps} variant={variant} />);

        const field = screen.getByTestId(`${defaultProps.testID}-field`);
        const input = screen.getByTestId(defaultProps.testID, {
          includeHiddenElements: true,
        });

        expect(field).toHaveProp('testID', `${defaultProps.testID}-field`);
        expect(field).toHaveProp('accessible', false);
        expect(input).toHaveProp('accessibilityLabel', defaultProps.label);
        expect(input.props.accessibilityElementsHidden).toBeUndefined();
      },
    );

    it.each(floatingLabelVariants)(
      'reveals an empty %s field when the native input receives focus',
      (variant) => {
        render(<PerpsProCompactInput {...defaultProps} variant={variant} />);

        const label = screen.getByTestId(`${defaultProps.testID}-label`);
        const inactiveLabelStyle = label.props.style;

        fireEvent(
          screen.getByTestId(defaultProps.testID, {
            includeHiddenElements: true,
          }),
          'focus',
        );

        expect(label.props.style).not.toEqual(inactiveLabelStyle);
      },
    );

    it.each(floatingLabelVariants)(
      'keeps accessibility ownership on the input after the empty %s field activates',
      (variant) => {
        render(<PerpsProCompactInput {...defaultProps} variant={variant} />);

        fireEvent.press(screen.getByTestId(`${defaultProps.testID}-field`));

        expect(screen.getByTestId(`${defaultProps.testID}-field`)).toHaveProp(
          'accessible',
          false,
        );
        expect(
          screen.getByTestId(defaultProps.testID).props
            .accessibilityElementsHidden,
        ).toBeUndefined();
        expect(screen.getByTestId(defaultProps.testID)).toHaveProp(
          'accessibilityLabel',
          defaultProps.label,
        );
      },
    );

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

      fireEvent.press(screen.getByTestId(`${ids.KEYBOARD_DONE}-size`));

      expect(dismissSpy).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(`${ids.KEYBOARD_PREVIOUS}-size`),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(`${ids.KEYBOARD_NEXT}-size`),
      ).not.toBeOnTheScreen();
    });
  });

  it('delegates disabled field events to the design-system input', () => {
    const onFieldPress = jest.fn();
    render(
      <PerpsProCompactInput
        {...defaultProps}
        onFieldPress={onFieldPress}
        isDisabled
      />,
    );

    fireEvent.press(screen.getByText(defaultProps.label));

    expect(screen.getByTestId(defaultProps.testID)).toHaveProp(
      'isDisabled',
      true,
    );
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

    const input = screen.getByTestId(defaultProps.testID, {
      includeHiddenElements: true,
    });

    expect(input).toBeOnTheScreen();
    expect(input).toHaveProp('isDisabled', true);
    expect(input).toHaveProp('editable', false);
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

  it('blocks field callbacks and imperative focus while hidden', () => {
    const onFieldPress = jest.fn();
    const ref = React.createRef<{ focus: () => void }>();
    render(
      <PerpsProCompactInput
        {...defaultProps}
        ref={ref}
        isHidden
        onFieldPress={onFieldPress}
      />,
    );
    const input = screen.getByTestId(defaultProps.testID, {
      includeHiddenElements: true,
    });

    fireEvent(input, 'pressIn');
    fireEvent(input, 'pressOut');
    ref.current?.focus();

    expect(onFieldPress).not.toHaveBeenCalled();
    expect(mockInputFocus).not.toHaveBeenCalled();
  });

  it('blurs the native input when the field becomes hidden', () => {
    const { rerender } = render(
      <PerpsProCompactInput {...defaultProps} isHidden={false} />,
    );

    expect(mockInputBlur).not.toHaveBeenCalled();

    rerender(<PerpsProCompactInput {...defaultProps} isHidden />);

    expect(mockInputBlur).toHaveBeenCalledTimes(1);
  });

  it('focuses from the wrapper after hiding without a native blur event', () => {
    const onFieldPress = jest.fn();
    const onFocus = jest.fn();
    const { rerender } = render(
      <PerpsProCompactInput
        {...defaultProps}
        onFieldPress={onFieldPress}
        onFocus={onFocus}
      />,
    );
    const input = screen.getByTestId(defaultProps.testID);
    fireEvent(input, 'focus');
    onFocus.mockClear();

    rerender(
      <PerpsProCompactInput
        {...defaultProps}
        isHidden
        onFieldPress={onFieldPress}
        onFocus={onFocus}
      />,
    );
    rerender(
      <PerpsProCompactInput
        {...defaultProps}
        onFieldPress={onFieldPress}
        onFocus={onFocus}
      />,
    );
    fireEvent.press(screen.getByText(defaultProps.label));

    expect(mockInputFocus).toHaveBeenCalledTimes(1);
    expect(onFieldPress).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId(defaultProps.testID), 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
