import React from 'react';
import { render, screen } from '@testing-library/react-native';
import CashTokensFullViewSkeleton, {
  CashTokensFullViewSkeletonTestIds,
} from './CashTokensFullViewSkeleton';

const {
  CONTAINER,
  TOKEN_ROW,
  EMPTY_STATE_ROW,
  BONUS_SECTION,
  CONVERT_SECTION,
} = CashTokensFullViewSkeletonTestIds;

describe('CashTokensFullViewSkeleton', () => {
  it('renders the skeleton container', () => {
    render(
      <CashTokensFullViewSkeleton
        hasMusdBalance={false}
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.getByTestId(CONTAINER)).toBeOnTheScreen();
  });

  it('renders token row skeletons when user has mUSD balance', () => {
    render(
      <CashTokensFullViewSkeleton
        hasMusdBalance
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.getAllByTestId(TOKEN_ROW)).toHaveLength(2);
    expect(screen.queryByTestId(EMPTY_STATE_ROW)).not.toBeOnTheScreen();
  });

  it('renders empty state row skeleton when user has no mUSD balance', () => {
    render(
      <CashTokensFullViewSkeleton
        hasMusdBalance={false}
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.getByTestId(EMPTY_STATE_ROW)).toBeOnTheScreen();
    expect(screen.queryByTestId(TOKEN_ROW)).not.toBeOnTheScreen();
  });

  it('renders bonus and convert sections when MoneyHub is enabled', () => {
    render(
      <CashTokensFullViewSkeleton
        hasMusdBalance={false}
        isMoneyHubEnabled
        conversionTokenCount={2}
      />,
    );
    expect(screen.getByTestId(BONUS_SECTION)).toBeOnTheScreen();
    expect(screen.getByTestId(CONVERT_SECTION)).toBeOnTheScreen();
  });

  it('omits bonus and convert sections when MoneyHub is disabled', () => {
    render(
      <CashTokensFullViewSkeleton
        hasMusdBalance
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.queryByTestId(BONUS_SECTION)).not.toBeOnTheScreen();
    expect(screen.queryByTestId(CONVERT_SECTION)).not.toBeOnTheScreen();
  });
});
