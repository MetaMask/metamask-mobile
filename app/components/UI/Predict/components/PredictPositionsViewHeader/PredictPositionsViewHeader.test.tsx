import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PredictPortfolioModel } from '../../hooks/usePredictPortfolio';
import { PredictPositionsViewSelectorsIDs } from '../../Predict.testIds';
import PredictPositionsViewHeader from './PredictPositionsViewHeader';

const mockClaim = jest.fn();

const createPortfolio = (
  overrides: Partial<PredictPortfolioModel> = {},
): PredictPortfolioModel => ({
  accountStateError: null,
  actionableClaimablePositions: [],
  activePositions: [],
  availableBalance: 0,
  balanceError: null,
  claim: mockClaim,
  claimableAmount: 0,
  claimablePositionCount: 0,
  claimablePositions: [],
  claimablePositionsError: null,
  deposit: jest.fn(),
  error: null,
  hasClaimableWinnings: false,
  isBalanceLoading: false,
  isClaimPending: false,
  isDepositPending: false,
  isLoading: false,
  isPositionsLoading: false,
  isRefreshing: false,
  openPositionCount: 0,
  openPositions: [],
  openPositionsError: null,
  openPositionsValue: 0,
  portfolioValue: 0,
  positionsBadgeCount: 0,
  refetch: jest.fn(),
  showPnlLine: false,
  showUnrealizedPnl: false,
  totalUnrealizedPnlAmount: 0,
  totalUnrealizedPnlPercent: undefined,
  walletType: undefined,
  withdraw: jest.fn(),
  withdrawTransaction: undefined,
  ...overrides,
});

const renderHeader = ({
  isPrivacyMode = false,
  portfolio = createPortfolio(),
}: {
  isPrivacyMode?: boolean;
  portfolio?: PredictPortfolioModel;
} = {}) =>
  render(
    <PredictPositionsViewHeader
      isPrivacyMode={isPrivacyMode}
      onClaimPress={mockClaim}
      portfolio={portfolio}
    />,
  );

describe('PredictPositionsViewHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always renders the available balance row for first-time zero state', () => {
    renderHeader();

    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.SUMMARY),
    ).toBeOnTheScreen();
    expect(screen.getByText('Available balance')).toBeOnTheScreen();
    expect(screen.getByText('$0.00')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_ROW),
    ).toBeNull();
    expect(
      screen.queryByTestId(PredictPositionsViewSelectorsIDs.CLAIM_CTA),
    ).toBeNull();
  });

  it('renders Unrealized P&L when the portfolio model says the line should show', () => {
    renderHeader({
      portfolio: createPortfolio({
        availableBalance: 250,
        showPnlLine: true,
        showUnrealizedPnl: true,
        totalUnrealizedPnlAmount: 46.35,
        totalUnrealizedPnlPercent: 20.23,
      }),
    });

    expect(screen.getByText('$250.00')).toBeOnTheScreen();
    expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    expect(screen.getByText('+$46.35 (+20.23%)')).toBeOnTheScreen();
  });

  it('renders a negative Unrealized P&L value', () => {
    renderHeader({
      portfolio: createPortfolio({
        showPnlLine: true,
        showUnrealizedPnl: true,
        totalUnrealizedPnlAmount: -18.47,
        totalUnrealizedPnlPercent: -2.1,
      }),
    });

    expect(screen.getByText('-$18.47 (-2.1%)')).toBeOnTheScreen();
  });

  it('renders claim CTA inside the header when claimable winnings exist', () => {
    renderHeader({
      portfolio: createPortfolio({
        claimableAmount: 46.35,
        hasClaimableWinnings: true,
      }),
    });

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.CLAIM_CTA),
    );

    expect(screen.getByText('Claim $46.35')).toBeOnTheScreen();
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it('supports privacy mode with SensitiveText masking', () => {
    renderHeader({
      isPrivacyMode: true,
      portfolio: createPortfolio({
        availableBalance: 250,
        showPnlLine: true,
        showUnrealizedPnl: true,
        totalUnrealizedPnlAmount: 46.35,
        totalUnrealizedPnlPercent: 20.23,
      }),
    });

    expect(screen.getByText('•••••••••')).toBeOnTheScreen();
    expect(screen.getByText('••••••••••••')).toBeOnTheScreen();
    expect(screen.queryByText('$250.00')).toBeNull();
    expect(screen.queryByText('+$46.35 (+20.23%)')).toBeNull();
  });

  it('renders loading skeletons for balance and P&L rows', () => {
    renderHeader({
      portfolio: createPortfolio({
        isBalanceLoading: true,
        isPositionsLoading: true,
      }),
    });

    expect(
      screen.getByTestId(
        PredictPositionsViewSelectorsIDs.AVAILABLE_BALANCE_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_SKELETON,
      ),
    ).toBeOnTheScreen();
  });

  it('renders fallback text for balance and P&L errors', () => {
    renderHeader({
      portfolio: createPortfolio({
        balanceError: new Error('Balance failed'),
        openPositionsError: new Error('Positions failed'),
      }),
    });

    expect(screen.getAllByText('Unable to load')).toHaveLength(2);
  });
});
