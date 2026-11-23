import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import TradingActivityBenefits, {
  TRADING_ACTIVITY_BENEFITS,
  TRADING_ACTIVITY_BENEFIT_ICON_STATE,
} from './TradingActivityBenefits';

const TEST_ID = 'trading-activity-benefits';

const iconTestId = (
  id: string,
  state: keyof typeof TRADING_ACTIVITY_BENEFIT_ICON_STATE,
) => `${TEST_ID}-${id}-${TRADING_ACTIVITY_BENEFIT_ICON_STATE[state]}`;

describe('TradingActivityBenefits', () => {
  it('renders every benefit in order', () => {
    render(<TradingActivityBenefits isTradingActivityShown testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent(
      TRADING_ACTIVITY_BENEFITS.map(({ id }) =>
        strings(`social_leaderboard.trading_activity_benefits.${id}`),
      ).join(''),
    );
  });

  it('checks every benefit when trading activity is shown', () => {
    render(<TradingActivityBenefits isTradingActivityShown testID={TEST_ID} />);

    TRADING_ACTIVITY_BENEFITS.forEach(({ id }) => {
      expect(screen.getByTestId(iconTestId(id, 'shown'))).toBeOnTheScreen();
      expect(
        screen.queryByTestId(iconTestId(id, 'hidden')),
      ).not.toBeOnTheScreen();
    });
  });

  it('hides only trading benefits when trading activity is off', () => {
    render(
      <TradingActivityBenefits
        isTradingActivityShown={false}
        testID={TEST_ID}
      />,
    );

    ['positions', 'performance', 'fees'].forEach((id) => {
      expect(screen.getByTestId(iconTestId(id, 'hidden'))).toBeOnTheScreen();
    });
    ['private', 'follow'].forEach((id) => {
      expect(screen.getByTestId(iconTestId(id, 'shown'))).toBeOnTheScreen();
    });
  });
});
