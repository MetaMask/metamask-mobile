import React from 'react';
import { render } from '@testing-library/react-native';
import HomepagePredictTrendingMarkets from './HomepagePredictTrendingMarkets';

describe('HomepagePredictTrendingMarkets', () => {
  it('does not crash when list discovery feeds are missing', () => {
    const { toJSON } = render(
      <HomepagePredictTrendingMarkets
        title="Predictions"
        onViewAll={jest.fn()}
        headerTestIdKey="predictions"
        discoveryLayout="list"
        isLoadingMarkets={false}
        markets={[]}
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
