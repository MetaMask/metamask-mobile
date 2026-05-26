import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictPortfolio } from '../../hooks/usePredictPortfolio';
import PredictPortfolioModule from './PredictPortfolioModule';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

const mockNavigate = jest.fn();
const mockExecuteGuardedAction = jest.fn((action: () => void | Promise<void>) =>
  action(),
);
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
  deposit: mockDeposit,
  hasClaimableWinnings: false,
  isClaimPending: false,
  isLoading: false,
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

describe('PredictPortfolioModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivacyMode = false;
    mockEnableDepositWalletWithdraw = false;
    mockUsePredictPortfolio.mockReturnValue(createPortfolio());
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

  it('routes action presses through the existing guarded flows', () => {
    const onDepositWalletWithdrawPress = jest.fn();
    renderWithProvider(
      <PredictPortfolioModule
        onDepositWalletWithdrawPress={onDepositWalletWithdrawPress}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_ADD_FUNDS),
    );
    expect(mockDeposit).toHaveBeenCalledWith({
      analyticsProperties: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
      },
    });

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_WITHDRAW),
    );
    expect(onDepositWalletWithdrawPress).toHaveBeenCalled();
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
  });

  it('uses the temporary Positions fallback until the route lands', () => {
    renderWithProvider(<PredictPortfolioModule />);

    fireEvent.press(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_POSITIONS),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MARKET_LIST, {
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    });
  });
});
