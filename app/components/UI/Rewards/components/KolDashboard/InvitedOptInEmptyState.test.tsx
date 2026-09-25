import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import InvitedOptInEmptyState from './InvitedOptInEmptyState';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('InvitedOptInEmptyState', () => {
  it('renders the prize icon, copy, CTA, and legal text', () => {
    const { getByTestId, getByText } = render(
      <InvitedOptInEmptyState onOptIn={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_OPT_IN_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_OPT_IN_ICON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_OPT_IN_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByText('rewards.kol.invited_opt_in_description'),
    ).toBeOnTheScreen();
    expect(getByText('rewards.kol.invited_opt_in_legal')).toBeOnTheScreen();
  });

  it('notifies the parent when the opt-in CTA is pressed', () => {
    const onOptIn = jest.fn();
    const { getByTestId } = render(
      <InvitedOptInEmptyState onOptIn={onOptIn} />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITED_OPT_IN_BUTTON));

    expect(onOptIn).toHaveBeenCalledTimes(1);
  });
});
