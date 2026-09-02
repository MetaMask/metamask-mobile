import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import ReferralEntryState from './ReferralEntryState';

describe('ReferralEntryState', () => {
  it('prompts a never-referred user for a code', () => {
    render(<ReferralEntryState />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.ENTRY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('rewards_money.entry.title')),
    ).toBeOnTheScreen();
  });

  it('explains why there is nothing to show yet', () => {
    render(<ReferralEntryState />);

    expect(
      screen.getByText(strings('rewards_money.entry.description')),
    ).toBeOnTheScreen();
  });
});
