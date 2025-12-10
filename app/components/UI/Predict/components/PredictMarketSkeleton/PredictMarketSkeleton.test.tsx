import React from 'react';
import { render } from '@testing-library/react-native';
import PredictMarketSkeleton from './PredictMarketSkeleton';

describe('PredictMarketSkeleton', () => {
  it('renders correctly with default testID', () => {
    const { getByTestId } = render(<PredictMarketSkeleton />);

    expect(getByTestId('predict-market-skeleton')).toBeTruthy();
    expect(getByTestId('predict-market-skeleton-avatar')).toBeTruthy();
    expect(getByTestId('predict-market-skeleton-title')).toBeTruthy();
    expect(getByTestId('predict-market-skeleton-chart')).toBeTruthy();
    expect(getByTestId('predict-market-skeleton-footer')).toBeTruthy();
  });

  it('renders correctly with custom testID', () => {
    const customTestId = 'custom-skeleton';
    const { getByTestId } = render(
      <PredictMarketSkeleton testID={customTestId} />,
    );

    expect(getByTestId(customTestId)).toBeTruthy();
    expect(getByTestId(`${customTestId}-avatar`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-title`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-chart`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-footer`)).toBeTruthy();
  });

  it('renders skeleton with correct structure', () => {
    const { getByTestId } = render(<PredictMarketSkeleton />);

    const container = getByTestId('predict-market-skeleton');
    expect(container).toBeTruthy();

    // All skeleton elements should be present
    const avatar = getByTestId('predict-market-skeleton-avatar');
    const title = getByTestId('predict-market-skeleton-title');
    const chart = getByTestId('predict-market-skeleton-chart');
    const footer = getByTestId('predict-market-skeleton-footer');

    expect(avatar).toBeTruthy();
    expect(title).toBeTruthy();
    expect(chart).toBeTruthy();
    expect(footer).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictMarketSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
