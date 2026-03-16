import React from 'react';
import { render } from '@testing-library/react-native';
import TronUnstakingBanner from './TronUnstakingBanner';
import { TronUnstakingBannerTestIds } from './TronUnstakingBanner.testIds';
import { strings } from '../../../../../../../locales/i18n';

describe('TronUnstakingBanner', () => {
  it('renders the unstaking text with the given amount', () => {
    const { getByTestId } = render(<TronUnstakingBanner amount="500" />);

    const expected = strings('stake.tron.trx_unstaking_in_progress', {
      amount: '500',
    });
    expect(
      getByTestId(TronUnstakingBannerTestIds.BANNER_TEXT),
    ).toHaveTextContent(expected);
  });

  it('renders with a different amount', () => {
    const { getByTestId } = render(<TronUnstakingBanner amount="1,234.5" />);

    const expected = strings('stake.tron.trx_unstaking_in_progress', {
      amount: '1,234.5',
    });
    expect(
      getByTestId(TronUnstakingBannerTestIds.BANNER_TEXT),
    ).toHaveTextContent(expected);
  });
});
