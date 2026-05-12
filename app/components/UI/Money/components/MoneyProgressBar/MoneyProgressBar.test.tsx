import React from 'react';
import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import MoneyProgressBar from './MoneyProgressBar';

const getFillWidth = (track: ReactTestInstance) => {
  const fill = track.children[0] as ReactTestInstance;
  return (fill.props.style as { width: string }).width;
};

describe('MoneyProgressBar', () => {
  it('renders with the provided testID', () => {
    const { getByTestId } = render(
      <MoneyProgressBar current={1} total={2} testID="progress" />,
    );

    expect(getByTestId('progress')).toBeOnTheScreen();
  });

  it('clamps the fill to 100% when current exceeds total', () => {
    const { getByTestId } = render(
      <MoneyProgressBar current={5} total={2} testID="progress" />,
    );

    expect(getFillWidth(getByTestId('progress'))).toBe('100%');
  });

  it('guards against a zero total to avoid divide-by-zero', () => {
    const { getByTestId } = render(
      <MoneyProgressBar current={0} total={0} testID="progress" />,
    );

    expect(getFillWidth(getByTestId('progress'))).toBe('0%');
  });
});
