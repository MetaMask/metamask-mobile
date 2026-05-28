import React from 'react';
import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { typography } from '@metamask/design-tokens';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictPortfolioSummary from './PredictPortfolioSummary';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const mockStrings: Record<string, string> = {
      'predict.portfolio.available_amount': `${params?.amount} available`,
      'predict.portfolio.value_accessibility': `Portfolio value, ${params?.value}`,
      'predict.portfolio.value_hidden_accessibility': 'Portfolio value hidden',
      'predict.unrealized_pnl_value': `${params?.amount} (${params?.percent})`,
    };
    return mockStrings[key] || key;
  }),
}));

const renderSummary = (
  overrides: Partial<React.ComponentProps<typeof PredictPortfolioSummary>> = {},
) =>
  renderWithProvider(
    <PredictPortfolioSummary
      availableBalance={0}
      portfolioValue={0}
      showPnlLine={false}
      totalUnrealizedPnlAmount={0}
      totalUnrealizedPnlPercent={0}
      {...overrides}
    />,
  );

describe('PredictPortfolioSummary', () => {
  it('renders the first-time value without a secondary P&L line', () => {
    renderSummary();

    expect(screen.getByText('$0.00')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_PORTFOLIO_TEST_IDS.SECONDARY_LINE),
    ).toBeNull();
    expect(screen.getByLabelText('Portfolio value, $0.00')).toBeOnTheScreen();
  });

  it('renders the returning user P&L and available balance line', () => {
    renderSummary({
      availableBalance: 250,
      portfolioValue: 4000,
      showPnlLine: true,
      totalUnrealizedPnlAmount: -18.47,
      totalUnrealizedPnlPercent: -2.1,
    });

    expect(screen.getByText('$4,000.00')).toBeOnTheScreen();
    expect(screen.getByText('-$18.47 (-2.1%)')).toBeOnTheScreen();
    expect(screen.getByText('$250.00 available')).toBeOnTheScreen();
  });

  it('renders the P&L amount without a percent when percent is omitted', () => {
    renderSummary({
      availableBalance: 250,
      portfolioValue: 260,
      showPnlLine: true,
      totalUnrealizedPnlAmount: 10,
      totalUnrealizedPnlPercent: undefined,
    });

    expect(screen.getByText('+$10.00')).toBeOnTheScreen();
    expect(screen.queryByText('+$10.00 (+0%)')).toBeNull();
    expect(screen.getByText('$250.00 available')).toBeOnTheScreen();
  });

  it('masks sensitive values in privacy mode', () => {
    renderSummary({
      availableBalance: 250,
      isHidden: true,
      portfolioValue: 4000,
      showPnlLine: true,
      totalUnrealizedPnlAmount: -18.47,
      totalUnrealizedPnlPercent: -2.1,
    });

    expect(screen.queryByText('$4,000.00')).toBeNull();
    expect(screen.getAllByText('••••••••••••')).toHaveLength(2);
    expect(screen.getByText('•••••••••')).toBeOnTheScreen();
    expect(screen.getByLabelText('Portfolio value hidden')).toBeOnTheScreen();
  });

  it('renders stable skeletons while loading', () => {
    renderSummary({ isLoading: true });

    const primarySkeleton = screen.getByTestId(
      PREDICT_PORTFOLIO_TEST_IDS.PRIMARY_SKELETON,
    );
    const secondarySkeleton = screen.getByTestId(
      PREDICT_PORTFOLIO_TEST_IDS.SECONDARY_SKELETON,
    );

    expect(primarySkeleton).toBeOnTheScreen();
    expect(secondarySkeleton).toBeOnTheScreen();
    expect(StyleSheet.flatten(primarySkeleton.props.style).height).toBe(
      typography.sDisplayLG.lineHeight,
    );
    expect(StyleSheet.flatten(secondarySkeleton.props.style).height).toBe(
      typography.sBodySM.lineHeight,
    );
  });
});
