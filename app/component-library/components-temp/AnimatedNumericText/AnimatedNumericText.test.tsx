import React from 'react';
import { act, render } from '@testing-library/react-native';
import { NumberFlow } from 'number-flow-react-native/native';

import AnimatedNumericText, {
  getNumberFlowConfig,
} from './AnimatedNumericText';

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
    const { getByTestId, UNSAFE_getAllByType } = render(
      <AnimatedNumericText
        value="$ 250.00 available"
        testID="animated-numeric-text"
      />,
    );

    expect(getByTestId('animated-numeric-text')).toHaveTextContent(
      '$ 250.00 available',
    );
    expect(UNSAFE_getAllByType(NumberFlow)).toHaveLength(1);
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

  it('falls back to lossless text when Number Flow would round the value', () => {
    const value = '9007199254740993.000001';

    expect(getNumberFlowConfig(value)).toBeUndefined();
  });

  it('defers mounting Number Flow until the JS thread is idle', () => {
    const mockRequestIdleCallback = jest.fn();
    const originalRequestIdleCallback = globalThis.requestIdleCallback;
    globalThis.requestIdleCallback = mockRequestIdleCallback;

    const { UNSAFE_queryAllByType } = render(
      <AnimatedNumericText value="250.00" deferRolling />,
    );

    expect(UNSAFE_queryAllByType(NumberFlow)).toHaveLength(0);

    act(() => {
      mockRequestIdleCallback.mock.calls[0][0]();
    });

    expect(UNSAFE_queryAllByType(NumberFlow)).toHaveLength(1);
    globalThis.requestIdleCallback = originalRequestIdleCallback;
  });
});
