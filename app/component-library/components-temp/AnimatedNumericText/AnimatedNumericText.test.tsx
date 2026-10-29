import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import AnimatedNumericText, { getNumericGlyphs } from './AnimatedNumericText';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const styles = StyleSheet.create({
  containerPadding: { paddingHorizontal: 8 },
  fontSizeLarge: { fontSize: 60 },
  fontSizeSmall: { fontSize: 32 },
});

describe('AnimatedNumericText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders the numeric string', () => {
    const { getByTestId } = render(
      <AnimatedNumericText value="12.0" testID="animated-numeric-text" />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent('12.0');
  });

  it('renders a trailing decimal point', () => {
    const { getByTestId } = render(
      <AnimatedNumericText value="12." testID="animated-numeric-text" />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent('12.');
  });

  it('renders a token amount beyond safe integer precision unchanged', () => {
    const { getByTestId } = render(
      <AnimatedNumericText
        value="9007199254740993.000001"
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '9007199254740993.000001',
    );
  });

  it('renders a currency symbol and trailing label around the number', () => {
    const { getByTestId } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
  });

  it('keeps a ticker containing digits as static text', () => {
    const { getByTestId } = render(
      <AnimatedNumericText value="5 1INCH" testID="animated-numeric-text" />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent('5 1INCH');
  });

  it('renders a bulk amount replacement with grouping commas', () => {
    const { getByTestId, rerender } = render(
      <AnimatedNumericText
        style={styles.fontSizeLarge}
        testID="animated-numeric-text"
        value="0.00"
      />,
    );

    rerender(
      <AnimatedNumericText
        style={styles.fontSizeSmall}
        testID="animated-numeric-text"
        value="1,234,567.89"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '1,234,567.89',
    );
  });

  it('renders grouping commas with a custom font size', () => {
    const { getByTestId } = render(
      <AnimatedNumericText
        style={styles.fontSizeSmall}
        testID="animated-numeric-text"
        value="12,345,678"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '12,345,678',
    );
  });

  it('applies layout styles to the container instead of each glyph', () => {
    const { getByTestId, getByText } = render(
      <AnimatedNumericText
        containerStyle={styles.containerPadding}
        testID="animated-numeric-text"
        value="12"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveStyle({
      paddingHorizontal: 8,
    });
    expect(StyleSheet.flatten(getByText('1').props.style)).not.toHaveProperty(
      'paddingHorizontal',
    );
  });

  it('renders static text when animation is disabled', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        animated={false}
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
    expect(UNSAFE_getAllByType(Text)).toHaveLength(1);
  });

  it('exposes the raw string to screen readers', () => {
    const { getByLabelText } = render(
      <AnimatedNumericText value="12." testID="animated-numeric-text" />,
    );

    expect(getByLabelText('12.')).toBeOnTheScreen();
  });

  it('allows a parent display to own accessibility', () => {
    const { queryByLabelText } = render(
      <AnimatedNumericText accessible={false} value="12." />,
    );

    expect(queryByLabelText('12.')).toBeNull();
  });

  it('renders high-precision values without numeric conversion', () => {
    const value = '9007199254740993.000001';
    const { getByLabelText } = render(<AnimatedNumericText value={value} />);

    expect(getByLabelText(value)).toHaveTextContent(value);
  });

  it('renders plain text when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getByTestId, UNSAFE_getAllByType } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
    expect(UNSAFE_getAllByType(Text)).toHaveLength(1);
  });
});

describe('getNumericGlyphs', () => {
  it('preserves existing digit identities when a thousands group is added', () => {
    const previousDigitKeys = getNumericGlyphs('999')
      .filter(({ character }) => /\d/u.test(character))
      .map(({ key }) => key);

    const nextDigitKeys = getNumericGlyphs('9,999')
      .filter(({ character }) => /\d/u.test(character))
      .map(({ key }) => key);

    expect(nextDigitKeys.slice(0, previousDigitKeys.length)).toEqual(
      previousDigitKeys,
    );
  });

  it('gives a changed digit a new identity at the same position', () => {
    const previousGlyphs = getNumericGlyphs('129');

    const nextGlyphs = getNumericGlyphs('120');

    expect(nextGlyphs[0].key).toBe(previousGlyphs[0].key);
    expect(nextGlyphs[1].key).toBe(previousGlyphs[1].key);
    expect(nextGlyphs[2].key).not.toBe(previousGlyphs[2].key);
  });
});
