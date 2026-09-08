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

  /**
   * The bar used to hide itself for a referee, who had only Activity. Claims
   * applies to referrer and referee alike, so two tabs is now the floor and the
   * bar always renders.
   */
  it('renders the bar for a referee, who now has Activity and Claims', () => {
    render(
      <EarningsTabs
        activeIndex={0}
        onTabPress={jest.fn()}
        showCodePerformance={false}
      />,
    );

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.EARNINGS_TABS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-claims`),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        `${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-code-performance`,
      ),
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

    // Code performance sits at 2 now that Claims occupies 1.
    expect(onTabPress).toHaveBeenCalledWith(2);
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
