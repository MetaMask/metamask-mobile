import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import PerpsProCompactInput, {
  getPerpsProInputAccessoryID,
} from './PerpsProCompactInput';

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

describe('PerpsProCompactInput', () => {
  beforeEach(() => {
    // Clears every mock's call history — including `defaultProps.onChangeText`,
    // which is shared across tests since `defaultProps` is a module-level
    // constant — not just `mockInputFocus`, so stale call counts can't bleed
    // between tests.
    jest.clearAllMocks();
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

    it('reports a tap that a visible inline input consumes', () => {
      const onFieldPress = jest.fn();
      render(
        <PerpsProCompactInput
          {...defaultProps}
          value="1"
          variant="inline"
          onFieldPress={onFieldPress}
        />,
      );

      fireEvent(screen.getByTestId(defaultProps.testID), 'pressIn');

      expect(onFieldPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('inline field press target', () => {
    it('shrinks the label and reveals the input when the row is pressed', () => {
      render(
        <PerpsProCompactInput
          {...defaultProps}
          variant="inline"
          placeholder="0.00"
          startAccessory={<Text>$</Text>}
        />,
      );

      const label = screen.getByTestId(`${defaultProps.testID}-label`);
      const input = screen.getByTestId(defaultProps.testID, {
        includeHiddenElements: true,
      });
      const inactiveLabelStyle = label.props.style;

      expect(input).toHaveProp('placeholder', '');

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
    });

    it('restores the full label after an empty inline field blurs', () => {
      render(<PerpsProCompactInput {...defaultProps} variant="inline" />);

      const label = screen.getByTestId(`${defaultProps.testID}-label`);
      const inactiveLabelStyle = label.props.style;

      fireEvent.press(screen.getByTestId(`${defaultProps.testID}-field`));
      fireEvent(screen.getByTestId(defaultProps.testID), 'blur');

      expect(label.props.style).toEqual(inactiveLabelStyle);
      expect(
        screen.getByTestId(defaultProps.testID, {
          includeHiddenElements: true,
        }),
      ).toHaveProp('placeholder', '');
    });

    it('keeps the compact label after a populated inline field blurs', () => {
      render(
        <PerpsProCompactInput
          {...defaultProps}
          value="123.45"
          variant="inline"
        />,
      );

      const label = screen.getByTestId(`${defaultProps.testID}-label`);
      const compactLabelStyle = label.props.style;

      fireEvent(screen.getByTestId(defaultProps.testID), 'blur');

      expect(label.props.style).toEqual(compactLabelStyle);
    });

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

    it('exposes an empty inline field as an activatable control instead of a static label', () => {
      render(<PerpsProCompactInput {...defaultProps} variant="inline" />);

      const field = screen.getByRole('button', { name: defaultProps.label });

      expect(field).toHaveProp('testID', `${defaultProps.testID}-field`);
      expect(
        screen.getByTestId(defaultProps.testID, {
          includeHiddenElements: true,
        }),
      ).toHaveProp('accessibilityElementsHidden', true);
    });

    it('focuses the hidden inline input when assistive tech activates the label', () => {
      render(<PerpsProCompactInput {...defaultProps} variant="inline" />);

      fireEvent.press(screen.getByRole('button', { name: defaultProps.label }));

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
    });

    it('hands accessibility to the input after the empty inline field activates', () => {
      render(<PerpsProCompactInput {...defaultProps} variant="inline" />);

      fireEvent.press(screen.getByTestId(`${defaultProps.testID}-field`));

      expect(screen.getByTestId(`${defaultProps.testID}-field`)).toHaveProp(
        'accessible',
        false,
      );
      expect(screen.getByTestId(defaultProps.testID)).toHaveProp(
        'accessibilityElementsHidden',
        false,
      );
      expect(screen.getByTestId(defaultProps.testID)).toHaveProp(
        'accessibilityLabel',
        defaultProps.label,
      );
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
