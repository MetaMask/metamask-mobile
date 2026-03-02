// Third party dependencies.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

// External dependencies.
import { TextVariant } from '../../../../Texts/Text';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

// Internal dependencies.
import Input from './Input';
import { INPUT_TEST_ID } from './Input.constants';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>);

const getStyleProp = (
  style: Record<string, unknown> | Record<string, unknown>[] | undefined,
  key: string,
): unknown => {
  if (!style) return undefined;
  const arr = Array.isArray(style) ? style : [style];
  for (let i = arr.length - 1; i >= 0; i--) {
    const val = (arr[i] as Record<string, unknown>)?.[key];
    if (val !== undefined) return val;
  }
  return undefined;
};

describe('Input', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input with testID', () => {
    const { getByTestId } = renderWithTheme(<Input />);

    expect(getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
  });

  it('applies TextVariant typography when textVariant provided', () => {
    const { getByTestId } = renderWithTheme(
      <Input textVariant={TextVariant.HeadingSM} />,
    );

    const input = getByTestId(INPUT_TEST_ID);
    const fontSize = getStyleProp(input.props.style, 'fontSize');

    expect(fontSize).toBe(mockTheme.typography.sHeadingSM.fontSize);
  });

  it('sets editable false and opacity 0.5 when isDisabled', () => {
    const { getByTestId } = renderWithTheme(<Input isDisabled />);

    const input = getByTestId(INPUT_TEST_ID);

    expect(input.props.editable).toBe(false);
    expect(getStyleProp(input.props.style, 'opacity')).toBe(0.5);
  });

  it('keeps opacity 1 when isStateStylesDisabled', () => {
    const { getByTestId } = renderWithTheme(<Input isStateStylesDisabled />);

    const input = getByTestId(INPUT_TEST_ID);

    expect(getStyleProp(input.props.style, 'opacity')).toBe(1);
  });

  it('applies lineHeight 0 when placeholder is provided and value is empty', () => {
    const { getByTestId } = renderWithTheme(
      <Input value="" placeholder="Enter text" />,
    );

    const input = getByTestId(INPUT_TEST_ID);

    expect(getStyleProp(input.props.style, 'lineHeight')).toBe(0);
  });

  it('omits lineHeight when value is empty but no placeholder', () => {
    const { getByTestId } = renderWithTheme(<Input value="" />);

    const input = getByTestId(INPUT_TEST_ID);

    expect(getStyleProp(input.props.style, 'lineHeight')).toBeUndefined();
  });

  it('omits lineHeight when value is non-empty', () => {
    const { getByTestId } = renderWithTheme(<Input value="hello" />);

    const input = getByTestId(INPUT_TEST_ID);

    expect(getStyleProp(input.props.style, 'lineHeight')).toBeUndefined();
  });

  it('calls onChangeText when text changes (controlled)', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderWithTheme(
      <Input value="" onChangeText={onChangeText} />,
    );

    const input = getByTestId(INPUT_TEST_ID);
    fireEvent.changeText(input, 'a');

    expect(onChangeText).toHaveBeenCalledWith('a');
  });

  describe('uncontrolled', () => {
    it('uses defaultValue as initial value and displays it', () => {
      const { getByTestId } = renderWithTheme(<Input defaultValue="initial" />);

      const input = getByTestId(INPUT_TEST_ID);

      expect(input.props.value).toBe('initial');
    });

    it('updates internal value and displayed value when user types', () => {
      const { getByTestId } = renderWithTheme(<Input />);

      const input = getByTestId(INPUT_TEST_ID);
      fireEvent.changeText(input, 'typed');

      expect(getByTestId(INPUT_TEST_ID).props.value).toBe('typed');
    });

    it('invokes onChangeText when uncontrolled and user types', () => {
      const onChangeText = jest.fn();
      const { getByTestId } = renderWithTheme(
        <Input onChangeText={onChangeText} />,
      );

      const input = getByTestId(INPUT_TEST_ID);
      fireEvent.changeText(input, 'x');

      expect(onChangeText).toHaveBeenCalledWith('x');
    });

    it('syncs displayed value when defaultValue prop changes', () => {
      const { getByTestId, rerender } = renderWithTheme(
        <Input defaultValue="first" />,
      );

      expect(getByTestId(INPUT_TEST_ID).props.value).toBe('first');

      rerender(
        <ThemeContext.Provider value={mockTheme}>
          <Input defaultValue="second" />
        </ThemeContext.Provider>,
      );

      expect(getByTestId(INPUT_TEST_ID).props.value).toBe('second');
    });

    it('applies lineHeight 0 when uncontrolled with placeholder and empty defaultValue', () => {
      const { getByTestId } = renderWithTheme(
        <Input defaultValue="" placeholder="Hint" />,
      );

      const input = getByTestId(INPUT_TEST_ID);

      expect(getStyleProp(input.props.style, 'lineHeight')).toBe(0);
    });
  });
});
