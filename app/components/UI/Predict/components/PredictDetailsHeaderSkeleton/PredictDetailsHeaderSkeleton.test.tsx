import React from 'react';
import { render } from '@testing-library/react-native';
import PredictDetailsHeaderSkeleton from './PredictDetailsHeaderSkeleton';

describe('PredictDetailsHeaderSkeleton', () => {
  it('renders header skeleton with all elements', () => {
    const { getByTestId } = render(<PredictDetailsHeaderSkeleton />);

    expect(
      getByTestId('predict-details-header-skeleton-back-button'),
    ).toBeTruthy();
    expect(getByTestId('predict-details-header-skeleton-avatar')).toBeTruthy();
    expect(getByTestId('predict-details-header-skeleton-title')).toBeTruthy();
    expect(
      getByTestId('predict-details-header-skeleton-subtitle'),
    ).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-header-skeleton';
    const { getByTestId } = render(
      <PredictDetailsHeaderSkeleton testID={customTestId} />,
    );

    expect(getByTestId(`${customTestId}-back-button`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-avatar`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-title`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-subtitle`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictDetailsHeaderSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
