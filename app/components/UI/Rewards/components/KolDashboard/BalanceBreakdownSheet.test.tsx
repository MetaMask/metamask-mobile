import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import BalanceBreakdownSheet from './BalanceBreakdownSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { formatUsd, getClaimEarningsBreakdownRows } from './rewardsUiFixtures';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('BalanceBreakdownSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <BalanceBreakdownSheet isVisible={false} onClose={jest.fn()} />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_SHEET),
    ).toBeNull();
  });

  it('titles the sheet Balance breakdown and offers Got it', () => {
    const { getByTestId } = render(
      <BalanceBreakdownSheet isVisible onClose={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_TITLE),
    ).toHaveTextContent('rewards.kol.claims_breakdown_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_GOT_IT),
    ).toBeOnTheScreen();
  });

  it('lists the same claim buckets as the paused sheet', () => {
    const rows = getClaimEarningsBreakdownRows();

    const { getByTestId } = render(
      <BalanceBreakdownSheet isVisible onClose={jest.fn()} />,
    );

    rows.forEach((row) => {
      expect(
        getByTestId(
          `${KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_ROW}-${row.id}`,
        ),
      ).toHaveTextContent(
        `rewards.kol.${row.labelKey}${formatUsd(row.amount)}`,
      );
    });
  });

  it('closes when Got it is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BalanceBreakdownSheet isVisible onClose={onClose} />,
    );

    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.BALANCE_BREAKDOWN_GOT_IT),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
