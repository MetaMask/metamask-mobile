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
    const { getByTestId } = renderWithTheme(<Input value="" />);

    expect(getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
  });

  it('applies TextVariant typography when textVariant provided', () => {
    const { getByTestId } = renderWithTheme(
      <Input value="" textVariant={TextVariant.HeadingSM} />,
    );

    const input = getByTestId(INPUT_TEST_ID);
    const fontSize = getStyleProp(input.props.style, 'fontSize');

    expect(fontSize).toBe(mockTheme.typography.sHeadingSM.fontSize);
  });

  it('sets editable false and opacity 0.5 when isDisabled', () => {
    const { getByTestId } = renderWithTheme(<Input value="" isDisabled />);

    const input = getByTestId(INPUT_TEST_ID);

    expect(input.props.editable).toBe(false);
    expect(getStyleProp(input.props.style, 'opacity')).toBe(0.5);
  });

  it('keeps opacity 1 when isStateStylesDisabled', () => {
    const { getByTestId } = renderWithTheme(
      <Input value="" isStateStylesDisabled />,
    );

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

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderWithTheme(
      <Input value="" onChangeText={onChangeText} />,
    );

    const input = getByTestId(INPUT_TEST_ID);
    fireEvent.changeText(input, 'a');

    expect(onChangeText).toHaveBeenCalledWith('a');
  });
});
