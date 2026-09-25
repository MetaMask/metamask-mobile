import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import RewardsReferralAcceptedSplashView from './RewardsReferralAcceptedSplashView';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockExitRewardsFlow = jest.fn();

jest.mock('../utils', () => ({
  exitRewardsFlow: (...args: unknown[]) => mockExitRewardsFlow(...args),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      canGoBack: () => true,
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('../../../../images/rewards/referral-share-hero.png', () => 1);

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, opts?: Record<string, string>) => {
    if (key === 'rewards.kol.invite_accepted_body') {
      return `Earn double rebates through ${opts?.date ?? ''}.`;
    }
    const translations: Record<string, string> = {
      'rewards.kol.invite_accepted_eyebrow': 'Referral activated',
      'rewards.kol.invite_accepted_title': 'Your 2× rebate boost is active',
      'rewards.kol.invite_accepted_view_rewards': 'View rewards',
      'rewards.kol.invite_accepted_start_trading': 'Start trading',
    };
    return translations[key] ?? key;
  }),
}));

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

describe('RewardsReferralAcceptedSplashView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the activation copy with the offer end date', () => {
    // Arrange — the fixture offer runs 30 days from acceptance.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-24T12:00:00Z'));

    // Act
    const { getByTestId, getByText } = render(
      <RewardsReferralAcceptedSplashView />,
    );

    // Assert
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_SPLASH),
    ).toBeOnTheScreen();
    expect(getByText('Referral activated')).toBeOnTheScreen();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_TITLE),
    ).toHaveTextContent('Your 2× rebate boost is active');
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_BODY),
    ).toHaveTextContent('Earn double rebates through Oct 24, 2026.');
  });

  it('exits the rewards flow when view rewards is pressed', () => {
    // Arrange
    const { getByTestId } = render(<RewardsReferralAcceptedSplashView />);

    // Act
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_VIEW_REWARDS),
    );

    // Assert
    expect(mockExitRewardsFlow).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('exits the rewards flow when the splash is closed', () => {
    // Arrange
    const { getByTestId } = render(<RewardsReferralAcceptedSplashView />);

    // Act
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_CLOSE));

    // Assert
    expect(mockExitRewardsFlow).toHaveBeenCalled();
  });

  it('opens the trade actions sheet when start trading is pressed', () => {
    // Arrange
    const { getByTestId } = render(<RewardsReferralAcceptedSplashView />);

    // Act
    fireEvent.press(
      getByTestId(KOL_DASHBOARD_SELECTORS.INVITE_ACCEPTED_START_TRADING),
    );

    // Assert
    expect(mockExitRewardsFlow).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
      params: { hasBottomNotch: false },
    });
  });
});
