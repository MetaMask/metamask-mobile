import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import EarningsTab from './EarningsTab';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import {
  formatSignedUsd,
  formatUsd,
  KOL_EARNINGS_HISTORY_PREVIEW_COUNT,
} from './rewardsUiFixtures';
import {
  getClaimableRewards,
  resetClaimableRewards,
} from './rewardsClaimStore';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// `moduleNameMapper` resolves every `*.svg` import to the same shared mock, so
// this single factory covers both Phosphor icons that `HistoryKindAvatar` uses.
jest.mock('../../../../../images/rewards/hand-coins.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockPhosphorIcon() {
    return ReactActual.createElement(View, { testID: 'mock-phosphor-icon' });
  };
});

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../utils', () => ({
  navigateToRewardsRoute: (
    navigation: { navigate: (name: string, params: unknown) => void },
    screen: string,
    params?: unknown,
  ) => {
    navigation.navigate('RewardsFlow', { screen, params });
  },
}));

jest.mock('./ClaimMoneyFallOverlay', () => () => null);

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockSuccessToast = jest.fn((title: string) => ({ title }));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    closeToast: mockCloseToast,
    RewardsToastOptions: {
      success: mockSuccessToast,
    },
  }),
}));

const openResidency = (
  getByTestId: (id: string) => React.ReactTestInstance,
) => {
  fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_BUTTON));
};

const completeEligibleClaim = (
  getByTestId: (id: string) => React.ReactTestInstance,
) => {
  openResidency(getByTestId);
  fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO));
  fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_NO));
};

describe('EarningsTab', () => {
  beforeEach(() => {
    // The claim balance is shared with the Money tab card, so it has to start
    // each test at the fixture amount.
    resetClaimableRewards();
    mockShowToast.mockClear();
    mockCloseToast.mockClear();
    mockSuccessToast.mockClear();
    mockNavigate.mockClear();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the residency sheet when Claim is pressed', () => {
    const { getByTestId, queryByTestId } = render(<EarningsTab />);

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeNull();

    openResidency(getByTestId);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeOnTheScreen();
  });

  it('opens the tax form sheet when the user is a US person', () => {
    const { getByTestId, queryByTestId } = render(<EarningsTab />);

    openResidency(getByTestId);
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_YES));

    expect(
      queryByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_SHEET),
    ).toBeNull();
    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_SHEET),
    ).toBeOnTheScreen();
  });

  it('opens the US-activity sheet when the user is not a US person', () => {
    const { getByTestId } = render(<EarningsTab />);

    openResidency(getByTestId);
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_SHEET),
    ).toBeOnTheScreen();
  });

  it('runs the claim animation when no US activity is confirmed with reduce motion', async () => {
    const { getByTestId, getByText } = render(<EarningsTab />);

    completeEligibleClaim(getByTestId);

    expect(getByText('rewards.kol.claimed')).toBeOnTheScreen();
    expect(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_BUTTON)).toBeDisabled();
    await waitFor(() => {
      expect(
        getByTestId(KOL_DASHBOARD_SELECTORS.AVAILABLE_TO_CLAIM),
      ).toHaveTextContent(formatUsd(0));
    });
    expect(getClaimableRewards()).toBe(0);
    expect(mockSuccessToast).toHaveBeenCalledWith(
      'rewards.kol.claim_success_toast',
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'rewards.kol.claim_success_toast',
        timeoutMs: 4000,
        linkButtonOptions: expect.objectContaining({
          label: 'rewards.kol.claim_success_view_account',
        }),
      }),
    );

    mockShowToast.mock.calls[0][0].linkButtonOptions.onPress();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('dismisses the toast when View account redirects to the Money tab', async () => {
    const { getByTestId } = render(<EarningsTab />);

    completeEligibleClaim(getByTestId);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
    });
    mockShowToast.mock.calls[0][0].linkButtonOptions.onPress();

    expect(mockCloseToast).toHaveBeenCalledTimes(1);
  });

  it('opens the tax form sheet when US activity is confirmed', () => {
    const { getByTestId } = render(<EarningsTab />);

    openResidency(getByTestId);
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_RESIDENCY_NO));
    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.REWARDS_LOCATION_YES));

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.TAX_FORM_SHEET),
    ).toBeOnTheScreen();
  });

  it('claims when all activity is confirmed as outside the US', async () => {
    const { getByTestId, getByText } = render(<EarningsTab />);

    completeEligibleClaim(getByTestId);

    expect(getByText('rewards.kol.claimed')).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(KOL_DASHBOARD_SELECTORS.AVAILABLE_TO_CLAIM),
      ).toHaveTextContent(formatUsd(0));
    });
  });

  it('previews five history rows with two-decimal amounts', () => {
    const { getByTestId, getByText } = render(<EarningsTab />);

    expect(
      getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_LIST).children,
    ).toHaveLength(KOL_EARNINGS_HISTORY_PREVIEW_COUNT);
    expect(getByText('$91.20')).toBeOnTheScreen();
    expect(getByText(formatSignedUsd(12.4))).toBeOnTheScreen();
    expect(getByText(formatSignedUsd(-32.4))).toBeOnTheScreen();
  });

  it('includes referrals in the KOL breakdown and history', () => {
    const { getByText, getAllByText } = render(<EarningsTab />);

    expect(getByText('rewards.kol.referrals')).toBeOnTheScreen();
    expect(
      getAllByText('rewards.kol.history_referrals').length,
    ).toBeGreaterThan(0);
  });

  it('drops referrals from the invited breakdown and history', () => {
    const { queryByText, getByText } = render(<EarningsTab hideReferrals />);

    expect(queryByText('rewards.kol.referrals')).toBeNull();
    expect(queryByText('rewards.kol.history_referrals')).toBeNull();
    expect(getByText('rewards.kol.trade_commissions')).toBeOnTheScreen();
    expect(getByText('rewards.kol.trading_rebates')).toBeOnTheScreen();
  });

  it('opens the invited earnings history list without referrals', () => {
    const { getByTestId } = render(<EarningsTab hideReferrals />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_HEADER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_EARNINGS_HISTORY_VIEW,
      params: { hideReferrals: true },
    });
  });

  it('opens the earnings history list from the section header', () => {
    const { getByTestId } = render(<EarningsTab />);

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.HISTORY_HEADER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_EARNINGS_HISTORY_VIEW,
      params: undefined,
    });
  });

  it('opens the performance tab from the breakdown header', () => {
    const onViewPerformance = jest.fn();
    const { getByTestId } = render(
      <EarningsTab onViewPerformance={onViewPerformance} />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.BREAKDOWN_HEADER));

    expect(onViewPerformance).toHaveBeenCalledTimes(1);
  });
});
