import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { LinkableSocialAccount } from '../hooks/useLinkableSocialAccounts';
import LinkedAccountPicker from './LinkedAccountPicker';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const account: LinkableSocialAccount = {
  id: 'account-1',
  name: 'Account 1',
  address: '0x0000000000000000000000000000000000000001',
  balanceLabel: '$10',
  linkedAddresses: [],
};

const renderPicker = (
  overrides: Partial<React.ComponentProps<typeof LinkedAccountPicker>> = {},
) => {
  const onSelect = jest.fn();
  const onShareTradingActivityChange = jest.fn();
  renderWithProvider(
    <LinkedAccountPicker
      accounts={[account]}
      selectedAccountId={account.id}
      shareTradingActivity={false}
      onSelect={onSelect}
      onShareTradingActivityChange={onShareTradingActivityChange}
      {...overrides}
    />,
  );
  return { onSelect, onShareTradingActivityChange };
};

describe('LinkedAccountPicker', () => {
  it('names the linked account and the selected account', () => {
    renderPicker();

    expect(
      screen.getByText('social_leaderboard.profile_onboarding.linked_account'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Account 1')).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR),
    ).toHaveProp(
      'accessibilityLabel',
      'social_leaderboard.profile_onboarding.linked_account, Account 1',
    );
  });

  it('asks for an account when none is available', () => {
    renderPicker({ accounts: [], selectedAccountId: null });

    expect(
      screen.getByText('social_leaderboard.profile_onboarding.select_account'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR),
    ).toHaveProp(
      'accessibilityLabel',
      'social_leaderboard.profile_onboarding.linked_account, social_leaderboard.profile_onboarding.select_account',
    );
  });

  it('selects an account from the sheet', () => {
    const { onSelect } = renderPicker();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR),
    );
    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-${account.id}`,
      ),
    );

    expect(onSelect).toHaveBeenCalledWith(account);
  });

  it('reports the trading activity switch', () => {
    const { onShareTradingActivityChange } = renderPicker();

    fireEvent(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.SHARE_ACTIVITY_SWITCH,
      ),
      'valueChange',
      true,
    );

    expect(onShareTradingActivityChange).toHaveBeenCalledWith(true);
  });
});
