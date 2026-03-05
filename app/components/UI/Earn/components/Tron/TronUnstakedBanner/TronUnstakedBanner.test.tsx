import React from 'react';
import { render } from '@testing-library/react-native';
import TronUnstakedBanner from './TronUnstakedBanner';
import { TronUnstakedBannerTestIds } from './TronUnstakedBanner.testIds';
import { strings } from '../../../../../../../locales/i18n';

describe('TronUnstakedBanner', () => {
  it('renders the claim text with the given amount', () => {
    const { getByTestId } = render(<TronUnstakedBanner amount="100" />);

    const expected = strings('stake.tron.has_claimable_trx', {
      amount: '100',
    });
    expect(getByTestId(TronUnstakedBannerTestIds.BANNER_TEXT)).toHaveTextContent(
      expected,
    );
  });

  it('renders with a different amount', () => {
    const { getByTestId } = render(<TronUnstakedBanner amount="2,500" />);

    const expected = strings('stake.tron.has_claimable_trx', {
      amount: '2,500',
    });
    expect(getByTestId(TronUnstakedBannerTestIds.BANNER_TEXT)).toHaveTextContent(
      expected,
    );
  });
});
