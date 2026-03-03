import React from 'react';
import { render } from '@testing-library/react-native';
import TronUnstakingBanner from './TronUnstakingBanner';
import { strings } from '../../../../../../../locales/i18n';

describe('TronUnstakingBanner', () => {
  it('renders the unstaking text with the given amount', () => {
    const { getByText } = render(<TronUnstakingBanner amount="500" />);

    const expected = strings('stake.tron.trx_unstaking_in_progress', {
      amount: '500',
    });
    expect(getByText(expected)).toBeDefined();
  });

  it('renders with a different amount', () => {
    const { getByText } = render(<TronUnstakingBanner amount="1,234.5" />);

    const expected = strings('stake.tron.trx_unstaking_in_progress', {
      amount: '1,234.5',
    });
    expect(getByText(expected)).toBeDefined();
  });
});
