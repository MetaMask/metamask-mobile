import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import { PredictEventValues } from '../../constants/eventNames';
import type { PredictPortfolioModel } from '../../hooks/usePredictPortfolio';
import { PredictPositionsViewSelectorsIDs } from '../../Predict.testIds';
import PredictPositionsViewHeader from './PredictPositionsViewHeader';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const mockExecuteGuardedAction = jest.fn();
jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
  }),
}));

const mockNavigation = {
  navigate: jest.fn(),
};

const mockUseNavigation = useNavigation as jest.Mock;
const mockClaim = jest.fn();
const mockTrackPortfolioTransactionInitiated = jest.fn();

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
  isOpenPositionsLoading: false,
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
  withdrawTransaction: null,
  ...overrides,
});

const renderHeader = ({
  entryPoint,
  isPrivacyMode = false,
  portfolio = createPortfolio(),
}: {
  entryPoint?: typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS;
  isPrivacyMode?: boolean;
  portfolio?: PredictPortfolioModel;
} = {}) =>
  render(
    <PredictPositionsViewHeader
      entryPoint={entryPoint}
      isPrivacyMode={isPrivacyMode}
      portfolio={portfolio}
    />,
  );

describe('PredictPositionsViewHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockExecuteGuardedAction.mockImplementation(
      async (action: () => void | Promise<void>) => {
        await action();
      },
    );
    const predictController = {
      trackPortfolioTransactionInitiated:
        mockTrackPortfolioTransactionInitiated,
    };
    (
      Engine.context as unknown as {
        PredictController: typeof predictController;
      }
    ).PredictController = predictController;
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

  it('wraps claim CTA presses in the Predict action guard and passes analytics context to claim', async () => {
    renderHeader({
      portfolio: createPortfolio({
        claimableAmount: 46.35,
        claimablePositionCount: 1,
        hasClaimableWinnings: true,
        openPositionCount: 2,
        portfolioValue: 4000,
        totalUnrealizedPnlAmount: -18.47,
      }),
    });

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.CLAIM_CTA),
    );

    expect(screen.getByText('Claim $46.35')).toBeOnTheScreen();
    await waitFor(() => {
      expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
        expect.any(Function),
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
      );
    });
    expect(mockClaim).toHaveBeenCalledWith({
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      openPositionsCount: 2,
      claimablePositionsCount: 1,
      hasClaimableWinnings: true,
      predictScreen: PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
    });
    const payload = mockClaim.mock.calls[0][0];
    expect(payload).not.toHaveProperty('claimableAmount');
    expect(payload).not.toHaveProperty('portfolioValue');
    expect(payload).not.toHaveProperty('totalUnrealizedPnlAmount');
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it('does not claim when the action guard short-circuits', async () => {
    mockExecuteGuardedAction.mockImplementationOnce(async () => undefined);

    renderHeader({
      portfolio: createPortfolio({
        claimableAmount: 46.35,
        claimablePositionCount: 1,
        hasClaimableWinnings: true,
        openPositionCount: 2,
      }),
    });

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.CLAIM_CTA),
    );

    await waitFor(() => {
      expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
        expect.any(Function),
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
      );
    });
    expect(mockClaim).not.toHaveBeenCalled();
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
        isOpenPositionsLoading: true,
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

  it('does not render a P&L skeleton when only claimable positions are loading', () => {
    renderHeader({
      portfolio: createPortfolio({
        isPositionsLoading: true,
        isOpenPositionsLoading: false,
      }),
    });

    expect(
      screen.queryByTestId(PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_ROW),
    ).toBeNull();
    expect(
      screen.queryByTestId(
        PredictPositionsViewSelectorsIDs.UNREALIZED_PNL_SKELETON,
      ),
    ).toBeNull();
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
