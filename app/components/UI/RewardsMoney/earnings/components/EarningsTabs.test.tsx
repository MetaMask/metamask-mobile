import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import EarningsTabs, { CodePerformancePlaceholder } from './EarningsTabs';

describe('EarningsTabs', () => {
  it('renders both tabs for a referrer', () => {
    render(
      <EarningsTabs
        activeIndex={0}
        onTabPress={jest.fn()}
        showCodePerformance
      />,
    );

    expect(
      screen.getByTestId(`${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-ledger`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-code-performance`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders no bar for a referee, who has only one tab', () => {
    render(
      <EarningsTabs
        activeIndex={0}
        onTabPress={jest.fn()}
        showCodePerformance={false}
      />,
    );

    expect(
      screen.queryByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_TABS),
    ).not.toBeOnTheScreen();
  });

  it('reports the selected index when a tab is pressed', () => {
    const onTabPress = jest.fn();
    render(
      <EarningsTabs
        activeIndex={0}
        onTabPress={onTabPress}
        showCodePerformance
      />,
    );

    fireEvent.press(
      screen.getByTestId(
        `${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-code-performance`,
      ),
    );

    expect(onTabPress).toHaveBeenCalledWith(1);
  });
});

describe('CodePerformancePlaceholder', () => {
  it('states plainly that code performance is not built yet', () => {
    render(<CodePerformancePlaceholder />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_TAB_PLACEHOLDER),
    ).toHaveTextContent(
      strings('rewards_money.earnings.code_performance_coming_soon'),
    );
  });
});
