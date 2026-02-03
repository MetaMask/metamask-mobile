import React from 'react';
import { render } from '@testing-library/react-native';
import PredictHomeSkeleton from './PredictHomeSkeleton';

describe('PredictHomeSkeleton', () => {
  it('renders with default testID', () => {
    const { getByTestId } = render(<PredictHomeSkeleton />);

    expect(getByTestId('predict-home-skeleton')).toBeOnTheScreen();
  });

  it('renders with custom testID', () => {
    const { getByTestId } = render(
      <PredictHomeSkeleton testID="custom-skeleton" />,
    );

    expect(getByTestId('custom-skeleton')).toBeOnTheScreen();
  });

  it('renders four skeleton items', () => {
    const { getByTestId } = render(<PredictHomeSkeleton />);

    expect(getByTestId('predict-home-skeleton-item-0')).toBeOnTheScreen();
    expect(getByTestId('predict-home-skeleton-item-1')).toBeOnTheScreen();
    expect(getByTestId('predict-home-skeleton-item-2')).toBeOnTheScreen();
    expect(getByTestId('predict-home-skeleton-item-3')).toBeOnTheScreen();
  });
});
