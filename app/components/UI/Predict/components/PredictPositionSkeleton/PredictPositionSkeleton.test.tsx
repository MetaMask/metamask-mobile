import React from 'react';
import { render } from '@testing-library/react-native';
import PredictPositionSkeleton from './PredictPositionSkeleton';

describe('PredictPositionSkeleton', () => {
  it('renders position skeleton with all elements', () => {
    const { getByTestId } = render(<PredictPositionSkeleton />);

    expect(getByTestId('predict-position-skeleton')).toBeTruthy();
    expect(getByTestId('predict-position-skeleton-image')).toBeTruthy();
    expect(getByTestId('predict-position-skeleton-title')).toBeTruthy();
    expect(getByTestId('predict-position-skeleton-subtitle')).toBeTruthy();
    expect(getByTestId('predict-position-skeleton-value')).toBeTruthy();
    expect(getByTestId('predict-position-skeleton-pnl')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-position-skeleton';
    const { getByTestId } = render(
      <PredictPositionSkeleton testID={customTestId} />,
    );

    expect(getByTestId(customTestId)).toBeTruthy();
    expect(getByTestId(`${customTestId}-image`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-title`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictPositionSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
