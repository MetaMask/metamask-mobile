import React from 'react';
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

describe('AnimatedNumericText', () => {
  beforeEach(() => {
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
