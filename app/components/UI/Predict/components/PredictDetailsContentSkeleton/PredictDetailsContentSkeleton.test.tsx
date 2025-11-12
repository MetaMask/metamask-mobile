import React from 'react';
import { render } from '@testing-library/react-native';
import PredictDetailsContentSkeleton from './PredictDetailsContentSkeleton';

describe('PredictDetailsContentSkeleton', () => {
  it('renders content skeleton with all outcome card elements', () => {
    const { getByTestId } = render(<PredictDetailsContentSkeleton />);

    expect(
      getByTestId('predict-details-content-skeleton-option-1'),
    ).toBeTruthy();

    // Outcome Card 1
    expect(
      getByTestId('predict-details-content-skeleton-option-2-avatar'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-2-title'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-2-subtitle'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-2-value-1'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-2-value-2'),
    ).toBeTruthy();

    // Outcome Card 2
    expect(
      getByTestId('predict-details-content-skeleton-option-3-avatar'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-3-title'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-3-subtitle'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-3-value-1'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-option-3-value-2'),
    ).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-content-skeleton';
    const { getByTestId } = render(
      <PredictDetailsContentSkeleton testID={customTestId} />,
    );

    expect(getByTestId(`${customTestId}-option-1`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-option-2-avatar`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-option-2-title`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-option-3-avatar`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictDetailsContentSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
