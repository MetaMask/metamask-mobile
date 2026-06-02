import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictPortfolio } from '../../hooks/usePredictPortfolio';
import PredictPortfolioModule from './PredictPortfolioModule';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

const mockNavigate = jest.fn();
const mockExecuteGuardedAction = jest.fn((action: () => void | Promise<void>) =>
  action(),
);
const mockTrackPortfolioModuleViewed = jest.fn();
const mockTrackPortfolioAction = jest.fn();
let mockPrivacyMode = false;
let mockEnableDepositWalletWithdraw = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => {
    if (selector === 'selectPrivacyMode') {
      return mockPrivacyMode;
    }

    if (selector === 'selectMetaMaskPayFlags') {
      return { enableDepositWalletWithdraw: mockEnableDepositWalletWithdraw };
    }

    return undefined;
  }),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: 'selectPrivacyMode',
}));

jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectMetaMaskPayFlags: 'selectMetaMaskPayFlags',
  }),
);

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
  }),
}));

jest.mock('../../hooks/usePredictPortfolio', () => ({
  usePredictPortfolio: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const mockStrings: Record<string, string> = {
      'predict.claim_amount_text': `Claim $${params?.amount}`,
      'predict.claiming_text': 'Claiming...',
      'predict.deposit.add_funds': 'Add funds',
      'predict.deposit.withdraw': 'Withdraw',
      'predict.portfolio.available_amount': `${params?.amount} available`,
      'predict.portfolio.value_accessibility': `Portfolio value, ${params?.value}`,
      'predict.portfolio.value_hidden_accessibility': 'Portfolio value hidden',
      'predict.tabs.positions': 'Positions',
      'predict.unrealized_pnl_value': `${params?.amount} (${params?.percent})`,
    };
    return mockStrings[key] || key;
  }),
}));

const mockUsePredictPortfolio = usePredictPortfolio as jest.Mock;

const mockClaim = jest.fn();
const mockDeposit = jest.fn();
const mockWithdraw = jest.fn();

const createPortfolio = (overrides = {}) => ({
  availableBalance: 0,
  claim: mockClaim,
  claimableAmount: 0,
  claimablePositionCount: 0,
  deposit: mockDeposit,
  hasClaimableWinnings: false,
  isClaimPending: false,
  isLoading: false,
  openPositionCount: 0,
  portfolioValue: 0,
  positionsBadgeCount: 0,
  showPnlLine: false,
  showUnrealizedPnl: false,
  totalUnrealizedPnlAmount: 0,
  totalUnrealizedPnlPercent: undefined,
  walletType: undefined,
  withdraw: mockWithdraw,
  ...overrides,
});

const expectedPortfolioContext = (overrides: Record<string, unknown> = {}) => ({
  positionsCount: 0,
  claimablePositionsCount: 0,
  hasClaimableWinnings: false,
  source: PredictEventValues.SOURCE.PREDICT_PORTFOLIO_MODULE,
  ...overrides,
});

const expectPortfolioActionTracked = (
  ctaName: string,
  entryPoint: string,
  overrides: Record<string, unknown> = {},
) => {
  expect(mockTrackPortfolioAction).toHaveBeenCalledWith(
    expectedPortfolioContext({
      ...overrides,
      ctaName,
      entryPoint,
    }),
  );
};

describe('PredictPortfolioModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivacyMode = false;
    mockEnableDepositWalletWithdraw = false;
    mockUsePredictPortfolio.mockReturnValue(createPortfolio());
    const predictController = {
      trackPortfolioModuleViewed: mockTrackPortfolioModuleViewed,
      trackPortfolioAction: mockTrackPortfolioAction,
    };
    (
      Engine.context as unknown as {
        PredictController: typeof predictController;
      }
    ).PredictController = predictController;
  });

  it('renders the first-time state with visible actions', () => {
    renderWithProvider(<PredictPortfolioModule />);

    expect(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.MODULE),
    ).toBeOnTheScreen();
    expect(screen.getByText('$0.00')).toBeOnTheScreen();
    expect(screen.getByText('Positions')).toBeOnTheScreen();
    expect(screen.getByText('Add funds')).toBeOnTheScreen();
    expect(screen.getByText('Withdraw')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_PORTFOLIO_TEST_IDS.SECONDARY_LINE),
    ).toBeNull();
  });

  it('renders returning state with P&L, available balance, and badge', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        availableBalance: 250,
        portfolioValue: 4000,
        positionsBadgeCount: 3,
        showPnlLine: true,
        showUnrealizedPnl: true,
        totalUnrealizedPnlAmount: -18.47,
        totalUnrealizedPnlPercent: -2.1,
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    expect(screen.getByText('$4,000.00')).toBeOnTheScreen();
    expect(screen.getByText('-$18.47 (-2.1%)')).toBeOnTheScreen();
    expect(screen.getByText('$250.00 available')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('renders claim CTA when claimable winnings exist', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        claimableAmount: 46.35,
        hasClaimableWinnings: true,
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    expect(screen.getByText('Claim $46.35')).toBeOnTheScreen();
  });

  it('supports privacy mode with sensitive values hidden', () => {
    mockPrivacyMode = true;
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        availableBalance: 250,
        portfolioValue: 4000,
        showPnlLine: true,
        showUnrealizedPnl: true,
        totalUnrealizedPnlAmount: -18.47,
        totalUnrealizedPnlPercent: -2.1,
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    expect(screen.queryByText('$4,000.00')).toBeNull();
    expect(screen.getByLabelText('Portfolio value hidden')).toBeOnTheScreen();
  });

  it('renders loading skeletons while portfolio data loads', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        isLoading: true,
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    expect(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.PRIMARY_SKELETON),
    ).toBeOnTheScreen();
    expect(screen.getByText('Positions')).toBeOnTheScreen();
  });

  it('tracks portfolio module viewed with count context after loading completes', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        availableBalance: 250,
        claimableAmount: 46.35,
        claimablePositionCount: 1,
        hasClaimableWinnings: true,
        openPositionCount: 2,
        portfolioValue: 4000,
        totalUnrealizedPnlAmount: -18.47,
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    expect(mockTrackPortfolioModuleViewed).toHaveBeenCalledWith(
      expectedPortfolioContext({
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        positionsCount: 2,
        claimablePositionsCount: 1,
        hasClaimableWinnings: true,
      }),
    );

    const payload = mockTrackPortfolioModuleViewed.mock.calls[0][0];
    expect(payload).not.toHaveProperty('availableBalance');
    expect(payload).not.toHaveProperty('claimableAmount');
    expect(payload).not.toHaveProperty('portfolioValue');
    expect(payload).not.toHaveProperty('totalUnrealizedPnlAmount');
  });

  it('does not track portfolio module viewed while portfolio data is loading', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        isLoading: true,
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    expect(mockTrackPortfolioModuleViewed).not.toHaveBeenCalled();
  });

  it('routes add funds press through the existing guarded flow', () => {
    renderWithProvider(<PredictPortfolioModule />);

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_ADD_FUNDS),
    );
    expect(mockDeposit).toHaveBeenCalledWith({
      analyticsProperties: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
      },
    });
    expectPortfolioActionTracked(
      PredictEventValues.CTA_NAME.ADD_FUNDS,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
    );
  });

  it('opens the withdraw fallback for deposit wallets without withdraw support', () => {
    const onDepositWalletWithdrawPress = jest.fn();
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        walletType: 'deposit-wallet',
      }),
    );

    renderWithProvider(
      <PredictPortfolioModule
        onDepositWalletWithdrawPress={onDepositWalletWithdrawPress}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_WITHDRAW),
    );
    expect(onDepositWalletWithdrawPress).toHaveBeenCalled();
    expectPortfolioActionTracked(
      PredictEventValues.CTA_NAME.WITHDRAW,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
    );
  });

  it('does not open withdraw fallback while wallet type is loading', () => {
    const onDepositWalletWithdrawPress = jest.fn();
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        availableBalance: 250,
      }),
    );

    renderWithProvider(
      <PredictPortfolioModule
        onDepositWalletWithdrawPress={onDepositWalletWithdrawPress}
      />,
    );

    const withdrawAction = screen.getByTestId(
      PREDICT_PORTFOLIO_TEST_IDS.ACTION_WITHDRAW,
    );

    expect(withdrawAction.props.accessibilityState).toEqual({
      disabled: true,
    });

    fireEvent.press(withdrawAction);

    expect(onDepositWalletWithdrawPress).not.toHaveBeenCalled();
    expect(mockWithdraw).not.toHaveBeenCalled();
    expect(mockTrackPortfolioAction).not.toHaveBeenCalled();
  });

  it('uses the real withdraw path when the wallet type supports it', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        walletType: 'safe',
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_WITHDRAW),
    );

    expect(mockWithdraw).toHaveBeenCalled();
    expectPortfolioActionTracked(
      PredictEventValues.CTA_NAME.WITHDRAW,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
    );
  });

  it('uses the claim flow from the shared portfolio model', () => {
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        claimableAmount: 46.35,
        hasClaimableWinnings: true,
      }),
    );

    renderWithProvider(<PredictPortfolioModule />);

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.CLAIM_BUTTON),
    );

    expect(mockClaim).toHaveBeenCalled();
    expectPortfolioActionTracked(
      PredictEventValues.CTA_NAME.CLAIM_ALL,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      { hasClaimableWinnings: true },
    );
  });

  it('uses the temporary Positions fallback until the route lands', () => {
    renderWithProvider(<PredictPortfolioModule />);

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_POSITIONS),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MARKET_LIST, {
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    });
    expectPortfolioActionTracked(
      PredictEventValues.CTA_NAME.POSITIONS,
      PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    );
  });
});
