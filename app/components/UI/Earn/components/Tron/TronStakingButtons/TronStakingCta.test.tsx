import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TronStakingCta from './TronStakingCta';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'stake.earn': 'Earn',
      'stake.stake_your_trx_cta.base': 'Stake your TRX and earn',
      'stake.stake_your_trx_cta.annually': 'annually',
      'stake.stake_your_trx_cta.learn_more_with_period': 'Learn more.',
    };
    return map[key] ?? key;
  },
}));

describe('TronStakingCta', () => {
  it('renders title and base description without APR or Learn More', () => {
    const { getByText, queryByText } = renderWithProvider(<TronStakingCta />);

    expect(getByText('Earn')).toBeOnTheScreen();
    expect(getByText('Stake your TRX and earn')).toBeOnTheScreen();
    expect(queryByText('annually')).toBeNull();
    expect(queryByText('Learn more.')).toBeNull();
  });

  it('renders APR and annually when aprText is provided', () => {
    const aprText = '4.5%';

    const { getByText } = renderWithProvider(
      <TronStakingCta aprText={aprText} />,
    );

    expect(getByText(aprText)).toBeOnTheScreen();
    expect(getByText('annually')).toBeOnTheScreen();
  });

  it('calls onLearnMore when Learn more is pressed', () => {
    const onLearnMore = jest.fn();

    const { getByText } = renderWithProvider(
      <TronStakingCta onLearnMore={onLearnMore} />,
    );

    fireEvent.press(getByText('Learn more.'));

    expect(onLearnMore).toHaveBeenCalledTimes(1);
  });
});
