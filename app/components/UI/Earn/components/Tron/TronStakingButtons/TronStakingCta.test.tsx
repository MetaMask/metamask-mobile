import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TronStakingCta from './TronStakingCta';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'stake.stake_your_trx_cta.title': 'Lend Tron and earn',
      'stake.stake_your_trx_cta.description_start': 'Stake your Tron and earn ',
      'stake.stake_your_trx_cta.description_end': ' annually.',
      'stake.stake_your_trx_cta.learn_more': 'Learn more.',
    };
    return map[key] ?? key;
  },
}));

describe('TronStakingCta', () => {
  it('renders title and description without APR or learn more button', () => {
    const { getByText, queryByText } = renderWithProvider(<TronStakingCta />);

    expect(getByText('Lend Tron and earn')).toBeOnTheScreen();
    expect(getByText('Stake your Tron and earn ')).toBeOnTheScreen();
    expect(getByText(' annually.')).toBeOnTheScreen();
    expect(queryByText('Learn more.')).toBeNull();
  });

  it('renders APR when aprText is provided', () => {
    const aprText = '4.5%';

    const { getByText } = renderWithProvider(
      <TronStakingCta aprText={aprText} />,
    );

    expect(getByText(aprText)).toBeOnTheScreen();
    expect(getByText(' annually.')).toBeOnTheScreen();
  });

  it('calls onEarn when learn more button is pressed', () => {
    const onEarn = jest.fn();

    const { getByText } = renderWithProvider(
      <TronStakingCta onEarn={onEarn} />,
    );

    fireEvent.press(getByText('Learn more.'));

    expect(onEarn).toHaveBeenCalledTimes(1);
  });
});
