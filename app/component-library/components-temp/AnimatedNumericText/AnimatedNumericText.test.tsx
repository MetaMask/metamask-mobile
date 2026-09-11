import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Laminar } from 'react-native-laminar';

import AnimatedNumericText from './AnimatedNumericText';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const styles = StyleSheet.create({
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
    const { getByTestId, UNSAFE_getByType } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
    expect(UNSAFE_getByType(Laminar).props.text).toBe('250.00');
  });

  it('keeps a ticker containing digits as static text', () => {
    const { getByTestId, UNSAFE_getByType } = render(
      <AnimatedNumericText value="5 1INCH" testID="animated-numeric-text" />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent('5 1INCH');
    expect(UNSAFE_getByType(Laminar).props.text).toBe('5');
  });

  it('rolls a bulk amount replacement through Laminar', () => {
    const { getByTestId, rerender, UNSAFE_getByType } = render(
      <AnimatedNumericText
        animateFontSize
        rollDigits={false}
        style={styles.fontSizeLarge}
        testID="animated-numeric-text"
        value="0.00"
      />,
    );

    rerender(
      <AnimatedNumericText
        animateFontSize
        rollDigits={false}
        style={styles.fontSizeSmall}
        testID="animated-numeric-text"
        value="1,234,567.89"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '1,234,567.89',
    );
    expect(UNSAFE_getByType(Laminar).props.text).toBe('1,234,567.89');
    expect(UNSAFE_getByType(Laminar).props.animationPreset).toBe('smooth');
  });

  it('keeps the first typed digit on slots instead of Laminar', () => {
    const { rerender, UNSAFE_queryAllByType } = render(
      <AnimatedNumericText rollDigits={false} value="0.00" />,
    );

    rerender(<AnimatedNumericText rollDigits={false} value="1" />);

    expect(UNSAFE_queryAllByType(Laminar)).toHaveLength(0);
  });

  it('keeps deleting the last digit on slots instead of Laminar', () => {
    const { rerender, UNSAFE_queryAllByType } = render(
      <AnimatedNumericText rollDigits={false} value="1" />,
    );

    rerender(<AnimatedNumericText rollDigits={false} value="0.00" />);

    expect(UNSAFE_queryAllByType(Laminar)).toHaveLength(0);
  });

  it('keeps keypad typing on slots instead of Laminar', () => {
    const { rerender, UNSAFE_queryAllByType } = render(
      <AnimatedNumericText rollDigits={false} value="12" />,
    );

    rerender(<AnimatedNumericText rollDigits={false} value="123" />);

    expect(UNSAFE_queryAllByType(Laminar)).toHaveLength(0);
  });

  it('renders grouping commas while font size is animating', () => {
    const { getByTestId } = render(
      <AnimatedNumericText
        animateFontSize
        rollDigits={false}
        style={styles.fontSizeSmall}
        testID="animated-numeric-text"
        value="12,345,678"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '12,345,678',
    );
  });

  it('renders grouping commas with digit rolling turned off', () => {
    const { getByTestId } = render(
      <AnimatedNumericText
        value="1,234,567.89"
        rollDigits={false}
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '1,234,567.89',
    );
  });

  it('renders the same content with digit rolling turned off', () => {
    const { getByTestId, UNSAFE_queryAllByType } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        rollDigits={false}
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
    expect(UNSAFE_queryAllByType(Laminar)).toHaveLength(0);
  });

  it('renders static text when animation is disabled', () => {
    const { getByTestId, UNSAFE_queryAllByType } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        animated={false}
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
    expect(UNSAFE_queryAllByType(Laminar)).toHaveLength(0);
  });

  it('exposes the raw string to screen readers', () => {
    const { getByLabelText } = render(
      <AnimatedNumericText value="12." testID="animated-numeric-text" />,
    );

    expect(getByLabelText('12.')).toBeOnTheScreen();
  });

  it('passes high-precision values to Laminar without numeric conversion', () => {
    const value = '9007199254740993.000001';
    const { UNSAFE_getByType } = render(<AnimatedNumericText value={value} />);

    expect(UNSAFE_getByType(Laminar).props.text).toBe(value);
  });

  it('renders plain text when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getByTestId, UNSAFE_queryAllByType } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
    expect(UNSAFE_queryAllByType(Laminar)).toHaveLength(0);
  });
});
