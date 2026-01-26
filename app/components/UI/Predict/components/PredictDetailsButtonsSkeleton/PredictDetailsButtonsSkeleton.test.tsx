import React from 'react';
import { render } from '@testing-library/react-native';
import PredictDetailsButtonsSkeleton from './PredictDetailsButtonsSkeleton';

describe('PredictDetailsButtonsSkeleton', () => {
  it('renders buttons skeleton with both buttons', () => {
    const { getByTestId } = render(<PredictDetailsButtonsSkeleton />);

    expect(
      getByTestId('predict-details-buttons-skeleton-button-1'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-buttons-skeleton-button-2'),
    ).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-buttons-skeleton';
    const { getByTestId } = render(
      <PredictDetailsButtonsSkeleton testID={customTestId} />,
    );

    expect(getByTestId(`${customTestId}-button-1`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-button-2`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictDetailsButtonsSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
