import React from 'react';
import { render } from '@testing-library/react-native';
import TronEstimatedAnnualRewardsUnavailableBanner, {
  TronEstimatedAnnualRewardsUnavailableBannerTestIds,
} from './TronEstimatedAnnualRewardsUnavailableBanner';

describe('TronEstimatedAnnualRewardsUnavailableBanner', () => {
  it('renders from message prop only', () => {
    const { getByTestId } = render(
      <TronEstimatedAnnualRewardsUnavailableBanner message="APR is temporarily unavailable" />,
    );

    expect(
      getByTestId(TronEstimatedAnnualRewardsUnavailableBannerTestIds.CONTAINER),
    ).toHaveTextContent('APR is temporarily unavailable');
  });
});
