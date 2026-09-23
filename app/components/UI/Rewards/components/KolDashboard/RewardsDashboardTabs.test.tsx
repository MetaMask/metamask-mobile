import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RewardsDashboardTabs from './RewardsDashboardTabs';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('RewardsDashboardTabs', () => {
  it('calls onChangeTab with earnings when the earnings tab is pressed', () => {
    const onChangeTab = jest.fn();

    const { getByTestId } = render(
      <RewardsDashboardTabs
        activeTab="waysToEarn"
        showEarningsDot
        onChangeTab={onChangeTab}
      />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.TAB_EARNINGS));

    expect(onChangeTab).toHaveBeenCalledWith('earnings');
  });

  it('calls onChangeTab with performance when the performance tab is pressed', () => {
    const onChangeTab = jest.fn();

    const { getByTestId } = render(
      <RewardsDashboardTabs
        activeTab="waysToEarn"
        showEarningsDot={false}
        onChangeTab={onChangeTab}
      />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.TAB_PERFORMANCE));

    expect(onChangeTab).toHaveBeenCalledWith('performance');
  });

  it('marks the earnings tab with a dot while funds are claimable', () => {
    const { getByTestId } = render(
      <RewardsDashboardTabs
        activeTab="waysToEarn"
        showEarningsDot
        onChangeTab={jest.fn()}
      />,
    );

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAB_EARNINGS_DOT),
    ).toBeOnTheScreen();
  });

  it('hides the earnings dot after claimable funds are gone', () => {
    const { queryByTestId } = render(
      <RewardsDashboardTabs
        activeTab="earnings"
        showEarningsDot={false}
        onChangeTab={jest.fn()}
      />,
    );

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.TAB_EARNINGS_DOT)).toBeNull();
  });
});
