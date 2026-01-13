import React from 'react';
import { render } from '@testing-library/react-native';
import PredictDetailsContentSkeleton from './PredictDetailsContentSkeleton';

describe('PredictDetailsContentSkeleton', () => {
  it('renders content skeleton with all elements', () => {
    const { getByTestId } = render(<PredictDetailsContentSkeleton />);

    expect(getByTestId('predict-details-content-skeleton-line-1')).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-block-1'),
    ).toBeTruthy();
    expect(getByTestId('predict-details-content-skeleton-line-2')).toBeTruthy();
    expect(
      getByTestId('predict-details-content-skeleton-block-2'),
    ).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-content-skeleton';
    const { getByTestId } = render(
      <PredictDetailsContentSkeleton testID={customTestId} />,
    );

    expect(getByTestId(`${customTestId}-line-1`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-block-1`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-line-2`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-block-2`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictDetailsContentSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
