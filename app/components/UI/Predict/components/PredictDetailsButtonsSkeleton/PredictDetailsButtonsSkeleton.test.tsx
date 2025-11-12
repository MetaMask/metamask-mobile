import React from 'react';
import { render } from '@testing-library/react-native';
import PredictDetailsButtonsSkeleton from './PredictDetailsButtonsSkeleton';

describe('PredictDetailsButtonsSkeleton', () => {
  it('renders buttons skeleton with both buttons', () => {
    const { getByTestId } = render(<PredictDetailsButtonsSkeleton />);

    expect(
      getByTestId('predict-details-buttons-skeleton-button-yes'),
    ).toBeTruthy();
    expect(
      getByTestId('predict-details-buttons-skeleton-button-no'),
    ).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-buttons-skeleton';
    const { getByTestId } = render(
      <PredictDetailsButtonsSkeleton testID={customTestId} />,
    );

    expect(getByTestId(`${customTestId}-button-yes`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-button-no`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictDetailsButtonsSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
