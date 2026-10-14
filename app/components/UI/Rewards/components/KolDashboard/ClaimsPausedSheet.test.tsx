import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ClaimsPausedSheet from './ClaimsPausedSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { formatUsd, getClaimEarningsBreakdownRows } from './rewardsUiFixtures';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('ClaimsPausedSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <ClaimsPausedSheet isVisible={false} onClose={jest.fn()} />,
    );

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_SHEET),
    ).toBeNull();
  });

  it('renders the paused copy and Got it action', () => {
    const { getByTestId } = render(
      <ClaimsPausedSheet isVisible onClose={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_TITLE),
    ).toHaveTextContent('rewards.kol.claims_paused_title');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_DESCRIPTION),
    ).toHaveTextContent('rewards.kol.claims_paused_description');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_GOT_IT),
    ).toBeOnTheScreen();
  });

  it('renders a full-width divider above the claim breakdown', () => {
    const { getByTestId } = render(
      <ClaimsPausedSheet isVisible onClose={jest.fn()} />,
    );

    const description = getByTestId(
      KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_DESCRIPTION,
    );
    const divider = getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_DIVIDER);

    expect(description).not.toContainElement(divider);
    expect(divider).toBeOnTheScreen();
  });

  it('renders a Breakdown header above the claim rows', () => {
    const { getByTestId } = render(
      <ClaimsPausedSheet isVisible onClose={jest.fn()} />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_BREAKDOWN_HEADER),
    ).toHaveTextContent('rewards.kol.breakdown');
  });

  it('lists claim buckets under total earnings', () => {
    const rows = getClaimEarningsBreakdownRows();

    const { getByTestId } = render(
      <ClaimsPausedSheet isVisible onClose={jest.fn()} />,
    );

    rows.forEach((row) => {
      expect(
        getByTestId(
          `${KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_BREAKDOWN}-${row.id}`,
        ),
      ).toHaveTextContent(
        `rewards.kol.${row.labelKey}${formatUsd(row.amount)}`,
      );
    });
  });

  it('closes when Got it is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ClaimsPausedSheet isVisible onClose={onClose} />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIMS_PAUSED_GOT_IT));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
