import React from 'react';
import { render } from '@testing-library/react-native';

import AnimatedNumericText from './AnimatedNumericText';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

describe('AnimatedNumericText', () => {
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

  it('renders the same content with digit rolling turned off', () => {
    const { getByTestId } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        rollDigits={false}
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
  });

  it('exposes the raw string to screen readers', () => {
    const { getByLabelText } = render(
      <AnimatedNumericText value="12." testID="animated-numeric-text" />,
    );

    expect(getByLabelText('12.')).toBeOnTheScreen();
  });
});
