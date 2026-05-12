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
        numChainsWithMusdBalance={0}
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.getByTestId(CONTAINER)).toBeOnTheScreen();
  });

  it('renders one token row skeleton per chain with mUSD balance', () => {
    render(
      <CashTokensFullViewSkeleton
        numChainsWithMusdBalance={2}
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.getAllByTestId(TOKEN_ROW)).toHaveLength(2);
    expect(screen.queryByTestId(EMPTY_STATE_ROW)).not.toBeOnTheScreen();
  });

  it('renders a single token row skeleton when user has mUSD on one chain', () => {
    render(
      <CashTokensFullViewSkeleton
        numChainsWithMusdBalance={1}
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.getAllByTestId(TOKEN_ROW)).toHaveLength(1);
    expect(screen.queryByTestId(EMPTY_STATE_ROW)).not.toBeOnTheScreen();
  });

  it('renders empty state row skeleton when user has no mUSD balance', () => {
    render(
      <CashTokensFullViewSkeleton
        numChainsWithMusdBalance={0}
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
        numChainsWithMusdBalance={0}
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
        numChainsWithMusdBalance={2}
        isMoneyHubEnabled={false}
        conversionTokenCount={0}
      />,
    );
    expect(screen.queryByTestId(BONUS_SECTION)).not.toBeOnTheScreen();
    expect(screen.queryByTestId(CONVERT_SECTION)).not.toBeOnTheScreen();
  });
});
